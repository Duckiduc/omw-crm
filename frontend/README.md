# OMW CRM Frontend

React frontend application for the OMW CRM system built with Vite, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **State Management**: Built-in React hooks (useState, useReducer, useContext)

## Features

- 🔐 JWT Authentication (Login/Register)
- 📊 Dashboard with overview statistics
- 👥 Contact management
- 🏢 Company management  
- 💼 Deal pipeline management
- 📅 Activity tracking
- 🎨 Clean, minimalist design
- 📱 Responsive layout

## Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Configuration**
Copy `.env.example` to `.env` and update if needed:
```bash
cp .env.example .env
```

The default API URL is `http://localhost:3001/api`

3. **Start Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   └── layout/          # Layout components
├── contexts/            # React contexts (Auth)
├── hooks/              # Custom hooks
├── lib/                # Utilities and API client
├── pages/              # Page components
└── App.tsx             # Main app component
```

## State Management

The application uses only built-in React state management:

- **useContext** + **useReducer** for global auth state
- **useState** for component-level state
- **useEffect** for data fetching and side effects

No external state management libraries are used to keep the bundle small and dependencies minimal.

## Authentication

- JWT tokens stored in localStorage
- Automatic token validation on app load
- Protected routes with redirect to login
- Auth context provides login/logout/register methods

## API Integration

The API client (`src/lib/api.ts`) provides:
- Typed API responses
- Automatic token handling
- Error handling
- Full CRUD operations for all entities

## Development

- Run `npm run dev` for development with hot reload
- Run `npm run build` to build for production
- Run `npm run preview` to preview production build
- All API calls are properly typed with TypeScript

## Design System

The UI follows a minimalist design with:
- Clean typography and spacing
- Consistent color scheme using CSS custom properties
- Responsive grid layouts
- Subtle shadows and borders
- Focus on usability and readability
