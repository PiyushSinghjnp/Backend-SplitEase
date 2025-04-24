# SplitEase Backend Architecture Documentation

## System Overview

SplitEase is an expense-sharing application that allows users to create groups, record expenses, and track balances between friends. The backend is built with Node.js, Express, TypeScript, and Prisma ORM with a PostgreSQL database.

## Core Components

### 1. Authentication System
- **JWT-based authentication** for securing API endpoints
- **User registration and login** with password hashing via bcrypt
- **Token verification middleware** to protect routes

### 2. Data Models

#### User
- Core user information (username, email, password)
- Relationships with groups, expenses, and other users

#### Group
- Collection of users who share expenses
- Contains expenses and balance records

#### Expense
- Financial transaction recorded within a group
- Includes amount, description, payer, and splits

#### ExpenseSplit
- Represents how an expense is divided among group members
- Contains user ID and share amount

#### Balance
- Represents debt between two users within a group
- Contains lender, borrower, and amount

#### Settlement
- Records payments made between users to settle debts

#### Friendship/FriendRequest
- Manages relationships between users

## Functional Modules

### 1. User Management
- **Registration**: Creates new user accounts with secure password storage
- **Authentication**: Verifies user credentials and issues JWT tokens
- **Profile Management**: Updates user information

### 2. Group Management
- **Group Creation**: Establishes new expense-sharing groups
- **Member Management**: Adds/removes users from groups
- **Group Listing**: Retrieves groups a user belongs to

### 3. Expense Management
- **Expense Recording**: Creates expenses with custom splitting options
- **Expense Retrieval**: Gets expense details and history
- **Expense Modification**: Updates or deletes existing expenses

### 4. Balance Calculation
- **Real-time Balance Updates**: Recalculates balances after expense changes
- **Simplification Algorithm**: Reduces the number of transactions needed for settlement
- **Balance Querying**: Retrieves current balances between users

### 5. Settlement System
- **Settlement Recording**: Tracks payments between users
- **Settlement Options**: Suggests optimal payment paths
- **Settlement History**: Maintains record of all settlements

### 6. Friend System
- **Friend Requests**: Sends/accepts/rejects friend connections
- **Friend Listing**: Retrieves user's friends
- **Relationship Status**: Determines connection between users

## API Structure

### Authentication Routes (`/api/v1/auth`)
- POST `/register`: Create new user account
- POST `/login`: Authenticate user and issue token

### Protected Routes (`/api/v1/protected`)
- GET `/dashboard`: Access user dashboard

### Friend Routes (`/api/v1/friends`)
- POST `/request`: Send friend request
- PUT `/request/:requestId`: Respond to friend request
- GET `/`: List all friends

### Group Routes (`/api/v1/groups`)
- POST `/create`: Create new group
- POST `/members`: Add member to group
- GET `/`: List user's groups
- GET `/:groupId`: Get group details

### Expense Routes (`/api/v1/expenses`)
- POST `/create`: Record new expense
- GET `/group/:groupId/summary`: Get expense summary for group
- GET `/:expenseId`: Get expense details
- PUT `/:expenseId`: Update expense
- DELETE `/:expenseId`: Delete expense

### Search Routes (`/api/v1/users`)
- GET `/search`: Search for users by username/email

## Technical Implementation

### Middleware
- **Authentication**: Verifies JWT tokens
- **Validation**: Uses Zod schemas to validate request data
- **Error Handling**: Centralizes error responses

### Utilities
- **Balance Calculation**: Complex algorithms for debt simplification
- **Relationship Status**: Determines connection between users
- **Password Handling**: Secures user credentials

### Database Interaction
- **Prisma ORM**: Type-safe database queries
- **Transaction Support**: Ensures data consistency
- **Relation Handling**: Manages complex relationships between entities

## Data Flow

1. **Request Validation**: All incoming requests are validated against Zod schemas
2. **Authentication**: Protected routes verify user identity via JWT
3. **Controller Logic**: Business logic processes the request
4. **Database Operations**: Prisma handles data persistence
5. **Response Formatting**: Standardized response structure

## Security Considerations

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secures API endpoints
- **Input Validation**: Prevents malicious data entry
- **Environment Variables**: Sensitive configuration stored in .env file