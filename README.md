# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Database Setup & Seeding

This project uses Prisma with a PostgreSQL database. Follow these steps to set up and seed your database:

### 1. Set Up Your Database
1.  Make sure you have PostgreSQL installed and running.
2.  Create a new database for this project.
3.  Update the `.env` file in the root of the project with your PostgreSQL connection string:

    ```env
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
    ```

    Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE` with your actual database credentials.

### 2. Apply the Schema
Run the following command to apply the Prisma schema to your database. This will create all the necessary tables and relationships.

```bash
npx prisma migrate dev --name init
```

### 3. Seed the Database
Run the following command to populate your database with the initial sample data.

```bash
npm run db:seed
```

After these steps, your database will be ready and populated with the same data used in the application's in-memory data store.
