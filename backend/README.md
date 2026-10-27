# Kredia Backend – AI-Powered Microfinance Platform

![Java](https://img.shields.io/badge/Java-17-blue)
![Spring Boot](https://img.shields.io/badge/SpringBoot-3.2.2-brightgreen)
![MySQL](https://img.shields.io/badge/MySQL-Database-blue)
![Maven](https://img.shields.io/badge/Maven-Build-orange)
![License](https://img.shields.io/badge/license-Academic-orange)

---

## Overview

This project was developed as part of the PIDEV – 4th Year Engineering Program at **Esprit School of Engineering** (Academic Year 2025–2026).

Kredia Backend is a robust Spring Boot microservice-based system designed to power an intelligent microfinance platform. It handles core business logic including credit management, user processing, financial transactions, AI services integration, and external API communication.

The backend follows a clean, layered, and modular architecture to ensure scalability, maintainability, and high performance.

---

## Features

* User authentication and authorization
* Loan simulation and credit management
* Transaction processing and invoice handling
* Credit approval workflow and repayment tracking
* AI-powered financial assistant using Google Gemini
* Email notification system using Brevo
* Cloud image storage with Cloudinary
* Financial market data integration (Alpha Vantage API)
* Blockchain integration using Hedera SDK
* Investment and portfolio management system
* Complaint and notification management
* Secure RESTful API architecture
* Modular and scalable backend design

---

## Tech Stack

### Backend

* Java 17
* Spring Boot 3.2.2
* Spring Data JPA
* Spring Security
* Maven
* Lombok
* Flyway

### Database

* MySQL

### External Services

* Google Gemini AI
* Brevo Email API
* Cloudinary
* Alpha Vantage API
* Hedera SDK

### Dev Tools

* Spring DevTools
* Git & GitHub
* Postman
* IntelliJ IDEA

---

## Architecture

The backend is built using a layered architecture following Spring Boot best practices.

### Application Layers

* Controller Layer (REST APIs)
* Service Layer (Business Logic)
* Repository Layer (Data Access)
* Entity Layer (Database Models)

### Architecture Principles

* Modular design
* Separation of concerns
* RESTful communication
* Scalable microservice-ready structure
* External API integration via dedicated services
* Clean and maintainable codebase

---

## Project Structure

```txt
kredia/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/kredia/
│   │   │       ├── controller/
│   │   │       ├── service/
│   │   │       ├── repository/
│   │   │       ├── entity/
│   │   │       └── KrediaApplication.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/
│   └── test/
│       └── java/
│           └── com/kredia/
│               └── KrediaApplicationTests.java
├── pom.xml
└── README.md
```

---

## Getting Started

### Prerequisites

* Java 17+
* Maven 3.6+
* MySQL Server

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/Esprit-PIDEV-4INFINI1-2025-Kredia.git
cd kredia
```

### Configure Database

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/kredia
spring.datasource.username=root
spring.datasource.password=your_password
```

### Run the Application

```bash
mvn clean install
mvn spring-boot:run
```

Backend runs on:

```txt
http://localhost:8080
```

---

## Useful Commands

### Compile Project

```bash
mvn clean compile
```

### Run Tests

```bash
mvn test
```

### Build JAR

```bash
mvn clean package
```

### Clean Project

```bash
mvn clean
```

---

## API Integration

Backend exposes REST APIs consumed by the Angular frontend.

Base URL:

```txt
http://localhost:8080
```

Integrated services:

* AI financial assistant (Gemini)
* Credit management APIs
* Authentication services
* Financial analytics APIs

---

## Deployment

The backend can be deployed using:

* Docker
* Render
* Railway
* DigitalOcean
* AWS

---

## Contributors

Presented by the Unity Nexus team:

- Mouhamed Ali Abidi  
- Mohamed Youssef Mellouli  
- Mohamed Aziz Ayed  
- Haroun Chebbane  
- Ghassen Hamdi

---

## Academic Context

Developed at **Esprit School of Engineering – Tunisia**

PIDEV – 4INFINI1 | Academic Year 2025–2026

---

## Acknowledgments

Special thanks to **Esprit School of Engineering**, supervisors, and contributors for their guidance and support.
