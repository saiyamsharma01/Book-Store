# Bookstore Management System Diagrams

This document contains the Entity-Relationship (ER) diagram and Data Flow Diagrams (DFD) for the Bookstore Management System. You can view these diagrams in any Markdown viewer that supports Mermaid.js, or by using extensions in VS Code/GitHub.

## 1. Entity-Relationship (ER) Diagram

This diagram shows the database structure and the relationships between the tables (`users`, `categories`, `books`, `orders`, and `order_items`).

```mermaid
erDiagram
    users {
        int id PK
        string name
        string email
        string password
        enum role "customer | admin"
        timestamp created_at
    }
    categories {
        int id PK
        string name
        string slug
        timestamp created_at
    }
    books {
        int id PK
        string title
        string author
        string description
        decimal price
        int stock
        string image
        int category_id FK
        timestamp created_at
    }
    orders {
        int id PK
        int user_id FK
        decimal total
        enum status "pending | paid | shipped | cancelled"
        timestamp created_at
    }
    order_items {
        int id PK
        int order_id FK
        int book_id FK
        int quantity
        decimal price
    }

    users ||--o{ orders : "places"
    categories ||--o{ books : "contains"
    orders ||--|{ order_items : "includes"
    books ||--o{ order_items : "is_part_of"
```

---

## 2. Context Diagram (Level 0 DFD)

The Context Diagram gives a high-level overview of the entire system as a single process, interacting with external entities (Customer and Admin).

```mermaid
flowchart TD
    C[Customer] -->|Browse Books, Add to Cart, Place Order| SYS(Bookstore Management System)
    SYS -->|Order Confirmation, Book Details| C
    A[Admin] -->|Manage Books, Categories, Orders| SYS
    SYS -->|Current Inventory, Order Status Details| A
```

---

## 3. Level 1 Data Flow Diagram (DFD)

The Level 1 DFD breaks down the main system into detailed sub-processes like Authentication, Catalog browsing, Cart management, Order processing, and Inventory management.

```mermaid
flowchart TD
    %% Entities
    C[Customer]
    A[Admin]

    %% Processes
    P1((1.0\nAuth Management))
    P2((2.0\nBrowse Catalog))
    P3((3.0\nCart Management\nSession))
    P4((4.0\nOrder Processing))
    P5((5.0\nInventory Mgt))

    %% Data Stores
    D1[(D1: Users DB)]
    D2[(D2: Books & Categories DB)]
    D3[(D3: Orders DB)]

    %% Customer Flows
    C -->|Login / Register Details| P1
    P1 -->|Auth Session / Status| C
    P1 <-->|Verify / Store User Data| D1
    
    C -->|Search Query / Filter| P2
    P2 -->|Book List & Details| C
    P2 <-->|Fetch Books / Categories| D2
    
    C -->|Add / Remove Books| P3
    P3 -->|Cart Totals & Details| C
    P2 -->|Selected Book Info| P3
    
    C -->|Checkout & Payment Details| P4
    P4 -->|Invoice / Order Confirmation| C
    P3 -->|Cart Data| P4
    P4 -->|Create Order & Order Items| D3
    P4 -->|Deduct Stock| D2

    %% Admin Flows
    A -->|Login Credentials| P1
    A -->|Add / Edit / Delete Books| P5
    P5 <-->|Update Stock & details| D2
    A -->|Change Order Status| P4
    P4 -->|View All Orders| A
```
