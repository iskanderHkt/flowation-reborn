FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o mock-ecommerce .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/mock-ecommerce .
EXPOSE 8081
CMD ["./mock-ecommerce"]
