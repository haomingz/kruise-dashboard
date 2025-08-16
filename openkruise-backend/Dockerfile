# Build stage
FROM golang:1.22-bookworm as builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o kruise-dashboard-backend main.go

# Run stage
FROM alpine:3.14.2
COPY --from=builder /app/kruise-dashboard-backend /app/kruise-dashboard-backend
EXPOSE 8080
ENTRYPOINT ["/app/kruise-dashboard-backend"]
