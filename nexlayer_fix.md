# Nexlayer working build fix

This file is the authoritative, pinned build solution for this repo. Nexlayer uses it verbatim on every run and will not override it. If a future build with this fix fails, Nexlayer appends/updates it rather than regenerating.

## Fixed Dockerfile

```dockerfile
FROM mirror.gcr.io/library/node:22-alpine AS frontend-builder
WORKDIR /app-frontend
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

FROM mirror.gcr.io/library/golang:1.23-alpine AS backend-builder
# The build log shows 'github.com/gin-contrib/cors@v1.7.7 requires go >= 1.25.0'
# Since Go 1.25/1.26 are not yet stable/standard in alpine, we use GOTOOLCHAIN=auto
# and a newer base if available, or force the toolchain to download the required version.
ENV GOTOOLCHAIN=auto
WORKDIR /app-backend
COPY server/go.mod server/go.sum ./
# Patch go.mod to use a version that allows the toolchain to manage dependencies
RUN sed -i 's/go 1.26.5/go 1.23/g' go.mod
RUN go mod download
COPY server/ ./
RUN go build -o main .

FROM mirror.gcr.io/library/alpine:latest
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY --from=backend-builder /app-backend/main .
COPY --from=frontend-builder /app-frontend/dist ./dist

ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

CMD ["./main"]
```

## Fixed nexlayer.yaml

```yaml
application:
  name: Cue-AI
  pods:
    - name: app
      image: "# filled by pipeline"
      path: /
      servicePorts:
        - 8080
      vars:
        PORT: "8080"
        HOSTNAME: "0.0.0.0"
        DATABASE_URL: "postgres://cueai:cueai@db.pod:5432/cueai?sslmode=disable"
    - name: db
      image: pgvector/pgvector:pg16
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: cueai
        POSTGRES_PASSWORD: cueai
        POSTGRES_DB: cueai
```
