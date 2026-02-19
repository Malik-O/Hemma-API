# Ramadan Habits Tracker - Backend

This is the backend for the Ramadan Habits Tracker application, built with **Express.js**, **MongoDB**, and **TypeScript**.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (Local or Atlas)

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory (if not exists) and add your environment variables:
   ```env
   PORT=4000
   MONGO_URI=mongodb://localhost:27017/ramadan_habits
   JWT_SECRET=your_jwt_secret_here
   CORS_ORIGIN=http://localhost:3001
   ```

### Running the Server

- **Development Mode** (with hot reload):

  ```bash
  npm run dev
  ```

- **Production Build**:
  ```bash
  npm run build
  npm start
  ```

## 📂 Project Structure

```
src/
├── config/         # Database connection
├── controllers/    # Request handlers (Auth, Sync, Leaderboard)
├── middleware/     # Authentication middleware
├── models/         # Mongoose schemas (User, SyncData, HabitCategory)
├── routes/         # API route definitions
└── server.ts       # Entry point
```

## 🔗 API Documentation

A **Postman Collection** is included in the project root: `Ramadan_Habits_Collection.json`. Import it into Postman to test the endpoints.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose)
- **Language:** TypeScript
- **Auth:** JWT (JSON Web Tokens)
