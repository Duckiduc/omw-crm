# OMW CRM - Personal/Professional CRM System

A modern, minimalist CRM system built with React.js, Node.js, and PostgreSQL. Perfect for managing contacts, companies, deals, activities, and detailed relationship tracking.

## 🚀 Features

### Core CRM Functionality

- **Contacts Management**: Store detailed contact information with custom tags
- **Companies Management**: Track company relationships and details
- **Deals Pipeline**: Manage deals through customizable stages
- **Activities**: Track calls, emails, meetings, notes, and tasks
- **Contact Notes**: Detailed timestamped notes for comprehensive contact history

### Advanced Features

- **Custom Tags**: Flexible tagging system for contacts
- **Contact Detail Pages**: 360-degree view of each contact with full history
- **Search & Filtering**: Powerful search across all data including tags
- **Background vs Notes**: Separate background information from timestamped notes
- **Authentication**: Secure JWT-based authentication system
- **Responsive Design**: Works great on desktop and mobile

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS v4** for styling
- **React Router DOM** for navigation
- **Lucide React** for icons

### Backend

- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** and **Helmet** for security

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd omw-crm
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install
   ```

   Create a `.env` file in the backend directory:

   ```env
   PORT=3001
   JWT_SECRET=your-jwt-secret-key-here
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=omw_crm
   DB_USER=postgres
   DB_PASSWORD=your-password
   ```

   Run database migrations:

   ```bash
   npm run migrate
   ```

   **⚠️ Important for Fresh Installations:**
   When setting up on a new computer, you **MUST** run the migration to create all database tables, including the new contact notes and tags features.

   Start the backend server:

   ```bash
   npm start
   ```

3. **Frontend Setup**

   ```bash
   cd ../frontend
   npm install
   ```

   Create a `.env` file in the frontend directory:

   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

   Start the development server:

   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173 (or the port shown in terminal)
   - Backend API: http://localhost:3001

## Project Structure

```
omw-crm/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── migrations/
│   │   └── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── contexts/
    │   ├── hooks/
    │   ├── lib/
    │   ├── pages/
    │   └── App.tsx
    ├── package.json
    └── .env
```

## Usage

### First Time Setup

1. **Register an Account**: Visit the registration page to create your admin account
2. **Login**: Use your credentials to access the CRM dashboard
3. **Add Companies**: Start by adding the companies you work with
4. **Add Contacts**: Create contact records and associate them with companies
5. **Create Deals**: Track sales opportunities through your pipeline
6. **Monitor Dashboard**: View overview metrics and upcoming activities

### Key Workflows

**Managing Contacts:**

- Use the search functionality to quickly find contacts
- Filter by company or other criteria
- Export contact information when needed

**Deal Management:**

- Create deals with estimated values and close dates
- Move deals through different stages
- Associate deals with specific contacts and companies

**Company Profiles:**

- Maintain detailed company information
- Track all contacts within each organization
- View company-specific deals and activities

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Contacts

- `GET /api/contacts` - List contacts with pagination/search
- `POST /api/contacts` - Create new contact
- `GET /api/contacts/:id` - Get contact details
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Companies

- `GET /api/companies` - List companies with pagination/search
- `POST /api/companies` - Create new company
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Deals

- `GET /api/deals` - List deals with filters
- `POST /api/deals` - Create new deal
- `GET /api/deals/:id` - Get deal details
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal
- `GET /api/deals/stages` - Get available deal stages

### Activities

- `GET /api/activities` - List activities
- `POST /api/activities` - Create new activity
- `GET /api/activities/upcoming` - Get upcoming activities

## Database Schema

The system uses PostgreSQL with the following main tables:

- **users** - User accounts and authentication
- **companies** - Company profiles and information
- **contacts** - Individual contact records
- **deals** - Sales opportunities and pipeline
- **dealStages** - Configurable deal pipeline stages
- **activities** - Tasks, meetings, and other activities

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- CORS configuration for cross-origin requests
- Helmet.js for security headers
- Input validation and sanitization

## Customization

The system is designed to be easily customizable:

- **Deal Stages**: Modify the deal stages in the database to match your sales process
- **Styling**: Update Tailwind CSS classes for custom branding
- **Fields**: Add custom fields to any entity through database migrations
- **Integrations**: Extend the API to connect with other tools

## Development

### Running in Development Mode

Both frontend and backend support hot reloading during development:

```bash
# Backend (with nodemon)
cd backend
npm run dev

# Frontend (with Vite)
cd frontend
npm run dev
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Backend runs directly with Node.js
cd backend
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is intended for personal/professional use. Please ensure you have the necessary rights before using in commercial applications.

## Support

For questions or issues:

1. Check the existing documentation
2. Review the code comments
3. Create an issue with detailed information about the problem

---

**Note**: This is a personal/professional CRM system designed for individual use or small teams. It provides essential CRM functionality with a clean, minimalist interface.
