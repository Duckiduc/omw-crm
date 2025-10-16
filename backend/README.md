# OMW CRM Backend

Node.js REST API backend for the OMW CRM application.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Validation**: express-validator
- **Security**: helmet, cors, bcryptjs

## Setup

1. **Install Dependencies**

```bash
npm install
```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL connection
- `JWT_SECRET`: Secret key for JWT tokens
- `FRONTEND_URL`: Frontend application URL for CORS

3. **Database Setup**
   Ensure PostgreSQL is running and create the database:

```bash
createdb omw_crm
```

Initialize the database tables:

```bash
npm run db:migrate
```

4. **Start Development Server**

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout (client-side)

### Contacts

- `GET /api/contacts` - List contacts (with pagination & search)
- `GET /api/contacts/:id` - Get contact details
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Companies

- `GET /api/companies` - List companies (with pagination & search)
- `GET /api/companies/:id` - Get company details with contacts & deals
- `POST /api/companies` - Create new company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Deals

- `GET /api/deals/stages` - Get deal stages
- `GET /api/deals` - List deals (with filtering)
- `GET /api/deals/by-stage` - Get deals grouped by stage (kanban)
- `GET /api/deals/:id` - Get deal details
- `POST /api/deals` - Create new deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Activities

- `GET /api/activities` - List activities (with filtering)
- `GET /api/activities/upcoming` - Get upcoming activities
- `GET /api/activities/:id` - Get activity details
- `POST /api/activities` - Create new activity
- `PUT /api/activities/:id` - Update activity
- `PATCH /api/activities/:id/toggle-complete` - Toggle completion
- `DELETE /api/activities/:id` - Delete activity

## Database Schema

The application uses the following main entities:

- **Users**: Authentication and ownership
- **Companies**: Business organizations
- **Contacts**: Individual people (linked to companies)
- **Deals**: Sales opportunities with stages and values
- **Deal Stages**: Customizable pipeline stages
- **Activities**: Tasks, calls, meetings, notes

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation and sanitization
- SQL injection prevention with parameterized queries

## Development

- Use `npm run dev` for development with nodemon auto-reload
- API includes comprehensive error handling and validation
- All routes (except auth) require valid JWT token
- User data is isolated per authenticated user
