package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
)

// engineDir is the mirrored engine (./reference/engine) esbuild resolves deck
// imports against. Resolved once, independent of the process working directory
// so a built binary doesn't silently fail every check.
var engineDir = findEngineDir()

func findEngineDir() string {
	candidates := []string{"reference/engine"}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "reference", "engine"))
	}
	for _, c := range candidates {
		if st, err := os.Stat(filepath.Join(c, "deck")); err == nil && st.IsDir() {
			if abs, err := filepath.Abs(c); err == nil {
				return abs
			}
			return c
		}
	}
	abs, _ := filepath.Abs("reference/engine")
	return abs
}

// CheckDeck transpiles and bundles the generated App.tsx against the fixed engine
// mirrored at ./reference/engine, marking react/framer-motion as external. It
// returns nil on success, or an error whose message is safe to feed back to the
// model (syntax errors, unresolved imports of hallucinated components, etc.).
// Prop-type errors are out of scope — esbuild does not typecheck.
func CheckDeck(appTsx string) error {
	result := api.Build(api.BuildOptions{
		Stdin: &api.StdinOptions{
			Contents:   appTsx,
			ResolveDir: engineDir,
			Sourcefile: "App.tsx",
			Loader:     api.LoaderTSX,
		},
		Bundle:   true,
		Write:    false,
		LogLevel: api.LogLevelSilent,
		JSX:      api.JSXAutomatic,
		External: []string{"react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "framer-motion"},
	})
	if len(result.Errors) == 0 {
		return nil
	}

	errs := result.Errors
	if len(errs) > 3 {
		errs = errs[:3]
	}
	msgs := api.FormatMessages(errs, api.FormatMessagesOptions{Kind: api.ErrorMessage})
	return fmt.Errorf("deck failed to compile:\n%s", strings.TrimSpace(strings.Join(msgs, "\n")))
}
