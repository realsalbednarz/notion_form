# Notion Form Builder

A powerful form builder that creates custom forms on top of Notion databases with create, edit, and view-only modes.

## Features

- 🎨 **Multiple Form Modes**: Create, edit, and view-only modes for different use cases
- 🔗 **Notion Integration**: Direct OAuth integration with Notion workspaces
- 🎯 **Flexible Field Configuration**: Customize labels, validation, defaults, and visibility
- 📊 **Relation Support**: Display data from related databases (read-only)
- 👥 **People Fields**: Resolve and display workspace users
- 🔍 **Filtering & Sorting**: Built-in support for filtering and sorting records
- 📄 **Pagination**: Handle large datasets efficiently
- ⚡ **Real-time Validation**: Form validation with stale data warnings

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Drizzle ORM
- **Authentication**: Notion OAuth 2.0
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- A Notion account
- A Notion integration (for OAuth)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd notion-form-builder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the integration details:
   - **Name**: Your form builder name
   - **Associated workspace**: Select your workspace
   - **Type**: Public integration
4. Under "Capabilities", enable:
   - Read content
   - Update content
   - Insert content
5. Under "Distribution", configure OAuth:
   - **Redirect URIs**: Add `http://localhost:3000/api/auth/notion/callback`
   - Copy your **Client ID** and **Client Secret**

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Notion credentials:

```env
NOTION_CLIENT_ID=your_client_id_here
NOTION_CLIENT_SECRET=your_client_secret_here
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback
DATABASE_URL=file:./dev.db
SESSION_SECRET=your_random_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a session secret:
```bash
openssl rand -base64 32
```

### 5. Initialize Database

Generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
notion-form-builder/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Authentication routes
│   ├── (dashboard)/         # Main application routes
│   ├── api/                 # API routes
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── forms/              # Form-related components
│   │   ├── FormBuilder/    # Form configuration UI
│   │   └── FormRenderer/   # Live form rendering
│   └── ui/                 # Reusable UI components
├── lib/                    # Utility libraries
│   ├── db/                # Database configuration
│   ├── notion/            # Notion API wrapper
│   └── auth/              # Authentication utilities
├── types/                 # TypeScript type definitions
└── drizzle/              # Database migrations
```

## Usage

### Creating a Form

1. **Select Database**: Choose a Notion database from your workspace
2. **Configure Form**: Name your form and select a mode (create/edit/view)
3. **Select Fields**: Choose which properties to include
4. **Configure Fields**: Customize labels, validation, and behavior
5. **Preview & Save**: Preview your form and save the configuration

### Form Modes

- **Create Mode**: Enter new data with support for default values
  - `today()`: Auto-fill with current date
  - `current_user`: Auto-fill with authenticated user
  
- **Edit Mode**: Modify existing records with explicit Update button
  - Includes stale data warnings
  - Configurable editable/read-only fields

- **View Mode**: Read-only rendering with no update capabilities

### Default Values

Configure default values for fields in create mode:

```typescript
{
  type: 'function',
  name: 'today'  // Auto-fills with current date
}

{
  type: 'function',
  name: 'current_user'  // Auto-fills with authenticated user
}

{
  type: 'static',
  value: 'Default text'  // Static default value
}
```

### Field Configuration

Each field can be customized with:

- **Label**: Display name for the field
- **Placeholder**: Hint text
- **Help Text**: Additional guidance
- **Required**: Mark as mandatory
- **Editable**: Allow/prevent editing
- **Visible**: Show/hide in form
- **Validation**: Min/max, patterns, custom messages
- **Relation Path**: Display related data (e.g., Project → Client → Name)

## API Routes

### Authentication
- `POST /api/auth/notion/login` - Initiate OAuth flow
- `GET /api/auth/notion/callback` - OAuth callback handler
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Forms
- `GET /api/forms` - List all forms
- `POST /api/forms` - Create form
- `GET /api/forms/:id` - Get form config
- `PUT /api/forms/:id` - Update form config
- `DELETE /api/forms/:id` - Delete form

### Notion Proxy
- `GET /api/notion/databases` - List databases
- `GET /api/notion/databases/:id` - Get database schema
- `GET /api/notion/databases/:id/query` - Query database
- `GET /api/notion/pages/:id` - Get page
- `POST /api/notion/pages` - Create page
- `PATCH /api/notion/pages/:id` - Update page

## Deployment

### Deploying to Vercel

1. Push your code to GitHub

2. Import project to Vercel:
   ```bash
   vercel
   ```

3. Configure environment variables in Vercel dashboard

4. Set up PostgreSQL database (Vercel Postgres recommended)

5. Update `NOTION_REDIRECT_URI` in Notion integration settings:
   ```
   https://your-domain.vercel.app/api/auth/notion/callback
   ```

6. Deploy:
   ```bash
   vercel --prod
   ```

### Database Migration (Production)

When deploying to production with PostgreSQL:

1. Update `DATABASE_URL` in environment variables
2. Update `drizzle.config.ts` to use PostgreSQL driver
3. Run migrations:
   ```bash
   npm run db:migrate
   ```

## Limitations (v0.1)

- Single user support (multi-user ready for future)
- Relation fields are display-only (no inline editing)
- Maximum 10 linked records shown for relations
- Per-field search only (no global search)
- Flat form layout (no sections)

## Roadmap

### Phase 2
- [ ] Multi-user support
- [ ] Inline relation editing
- [ ] Form sections and advanced layouts
- [ ] Conditional field visibility

### Phase 3
- [ ] Full-text search
- [ ] Form templates library
- [ ] Webhooks for submissions
- [ ] Analytics dashboard

### Phase 4
- [ ] Custom validation rules
- [ ] File upload support
- [ ] Export/import configurations
- [ ] Audit logging

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions:
1. Check the [documentation](./TECHNICAL_DESIGN.md)
2. Review existing issues
3. Create a new issue with detailed information

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Notion API](https://developers.notion.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
