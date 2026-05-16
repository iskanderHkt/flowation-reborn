package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

var db *sql.DB

type Product struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

type Order struct {
	ID           int       `json:"id"`
	CustomerName string    `json:"customer_name"`
	Total        float64   `json:"total"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func getProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, price, stock FROM products ORDER BY id")
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		rows.Scan(&p.ID, &p.Name, &p.Price, &p.Stock)
		products = append(products, p)
	}
	writeJSON(w, 200, products)
}

func getProduct(w http.ResponseWriter, r *http.Request, id int) {
	var p Product
	err := db.QueryRow("SELECT id, name, price, stock FROM products WHERE id = $1", id).
		Scan(&p.ID, &p.Name, &p.Price, &p.Stock)
	if err == sql.ErrNoRows {
		writeJSON(w, 404, map[string]string{"error": "product not found"})
		return
	}
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, p)
}

func createProduct(w http.ResponseWriter, r *http.Request) {
	var p Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid body"})
		return
	}
	err := db.QueryRow(
		"INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING id",
		p.Name, p.Price, p.Stock,
	).Scan(&p.ID)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, p)
}

func getOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, customer_name, total, status, created_at FROM orders ORDER BY id")
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var o Order
		rows.Scan(&o.ID, &o.CustomerName, &o.Total, &o.Status, &o.CreatedAt)
		orders = append(orders, o)
	}
	writeJSON(w, 200, orders)
}

func createOrder(w http.ResponseWriter, r *http.Request) {
	var o Order
	if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid body"})
		return
	}
	o.Status = "PENDING"
	err := db.QueryRow(
		"INSERT INTO orders (customer_name, total, status) VALUES ($1, $2, $3) RETURNING id, created_at",
		o.CustomerName, o.Total, o.Status,
	).Scan(&o.ID, &o.CreatedAt)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, o)
}

func router(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	parts := strings.Split(strings.TrimPrefix(path, "/"), "/")

	switch {
	case r.Method == "GET" && path == "/products":
		getProducts(w, r)
	case r.Method == "POST" && path == "/products":
		createProduct(w, r)
	case r.Method == "GET" && len(parts) == 2 && parts[0] == "products":
		id, err := strconv.Atoi(parts[1])
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid id"})
			return
		}
		getProduct(w, r, id)
	case r.Method == "GET" && path == "/orders":
		getOrders(w, r)
	case r.Method == "POST" && path == "/orders":
		createOrder(w, r)
	default:
		writeJSON(w, 404, map[string]string{"error": "not found"})
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5433"),
		getEnv("DB_USER", "ecom_user"),
		getEnv("DB_PASSWORD", "ecom_password"),
		getEnv("DB_NAME", "ecommerce"),
	)
	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatal("cannot connect to postgres:", err)
	}

	log.Println("mock-ecommerce API started on :8081")
	http.ListenAndServe(":8081", http.HandlerFunc(router))
}
