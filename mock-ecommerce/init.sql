CREATE TABLE IF NOT EXISTS products (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    price      NUMERIC(10, 2) NOT NULL,
    stock      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
    id            SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    total         NUMERIC(10, 2) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO products (name, price, stock) VALUES
    ('Laptop Pro 15',       1299.99, 10),
    ('Wireless Mouse',        29.99, 50),
    ('USB-C Hub',             49.99, 30),
    ('Mechanical Keyboard',   89.99, 20),
    ('Monitor 27"',          399.99, 15);
