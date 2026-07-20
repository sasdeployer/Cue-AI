package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// LLMClient streams a deck generation. Text deltas are delivered via onDelta;
// the full accumulated text is returned when generation completes.
type LLMClient interface {
	Generate(ctx context.Context, prompt string, onDelta func(string)) (string, error)
	Name() string
}

// ---------- Anthropic ----------

type AnthropicClient struct {
	apiKey string
	model  string
	http   *http.Client
}

func NewAnthropicClient(apiKey, model string) *AnthropicClient {
	return &AnthropicClient{
		apiKey: apiKey,
		model:  model,
		http:   &http.Client{Timeout: 5 * time.Minute},
	}
}

func (c *AnthropicClient) Name() string { return "anthropic:" + c.model }

func (c *AnthropicClient) Generate(ctx context.Context, prompt string, onDelta func(string)) (string, error) {
	reqBody := map[string]any{
		"model":      c.model,
		"max_tokens": 16000,
		"stream":     true,
		"system":     systemPrompt(),
		"messages": []map[string]any{
			{"role": "user", "content": prompt},
		},
	}
	b, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(b))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var sb strings.Builder
		s := bufio.NewScanner(resp.Body)
		for s.Scan() {
			sb.WriteString(s.Text())
		}
		return "", fmt.Errorf("anthropic %d: %s", resp.StatusCode, sb.String())
	}

	var full strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 1024*1024), 8*1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "" || data == "[DONE]" {
			continue
		}
		var ev struct {
			Type  string `json:"type"`
			Delta struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"delta"`
		}
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			continue
		}
		if ev.Type == "content_block_delta" && ev.Delta.Text != "" {
			full.WriteString(ev.Delta.Text)
			if onDelta != nil {
				onDelta(ev.Delta.Text)
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return full.String(), err
	}
	return full.String(), nil
}

// ---------- OpenAI (Chat Completions, streaming) ----------

type OpenAIClient struct {
	apiKey    string
	model     string
	reasoning string // "low" | "medium" | "high" — only sent for gpt-5* models
	http      *http.Client
}

func NewOpenAIClient(apiKey, model, reasoning string) *OpenAIClient {
	return &OpenAIClient{
		apiKey:    apiKey,
		model:     model,
		reasoning: reasoning,
		http:      &http.Client{Timeout: 5 * time.Minute},
	}
}

func (c *OpenAIClient) Name() string { return "openai:" + c.model }

func (c *OpenAIClient) Generate(ctx context.Context, prompt string, onDelta func(string)) (string, error) {
	reqBody := map[string]any{
		"model":                 c.model,
		"stream":                true,
		"max_completion_tokens": 32000,
		"messages": []map[string]any{
			{"role": "system", "content": systemPrompt()},
			{"role": "user", "content": prompt},
		},
	}
	// reasoning_effort is only valid on gpt-5* reasoning models.
	if strings.HasPrefix(c.model, "gpt-5") && c.reasoning != "" {
		reqBody["reasoning_effort"] = c.reasoning
	}
	b, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(b))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/json")
	req.Header.Set("authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var sb strings.Builder
		s := bufio.NewScanner(resp.Body)
		for s.Scan() {
			sb.WriteString(s.Text())
		}
		return "", fmt.Errorf("openai %d: %s", resp.StatusCode, sb.String())
	}

	var full strings.Builder
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 1024*1024), 8*1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "" || data == "[DONE]" {
			continue
		}
		var ev struct {
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			continue
		}
		if len(ev.Choices) > 0 {
			if txt := ev.Choices[0].Delta.Content; txt != "" {
				full.WriteString(txt)
				if onDelta != nil {
					onDelta(txt)
				}
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return full.String(), err
	}
	return full.String(), nil
}

// ---------- Canned fallback (no API key) ----------

type CannedClient struct{}

func (c *CannedClient) Name() string { return "canned" }

func (c *CannedClient) Generate(ctx context.Context, prompt string, onDelta func(string)) (string, error) {
	out := cannedDeck(prompt)
	// simulate streaming so the UI feels alive
	for _, chunk := range chunkString(out, 24) {
		select {
		case <-ctx.Done():
			return out, ctx.Err()
		default:
		}
		if onDelta != nil {
			onDelta(chunk)
		}
		time.Sleep(8 * time.Millisecond)
	}
	return out, nil
}

func chunkString(s string, n int) []string {
	var out []string
	for len(s) > n {
		out = append(out, s[:n])
		s = s[n:]
	}
	if s != "" {
		out = append(out, s)
	}
	return out
}
