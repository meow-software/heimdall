# Heimdall

Gardien de Tellme, il est celui qui veille et voit tout.

Heimdall is a powerful and watchful guardian for your applications. It acts as a reverse proxy, providing rate limiting, authentication, and routing capabilities to protect and manage your services.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/tellme-org/heimdall.git
    cd heimdall
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

### Development

To run the application in development mode with hot-reloading:

```bash
npm run start:dev
```

The application will be available at `http://localhost:3000` (or the port specified in your `.env` file).

### Production

To build and run the application in production mode:

```bash
npm run build
npm run start:prod
```

## Configuration

Configuration is managed through environment variables. Create a `.env` file in the root of the project by copying the `.env.example` file:

```bash
cp .env.example .env
```

### Environment Variables

*   `PORT`: The port the application will run on (default: `3000`).
*   `NODE_ENV`: The application environment (e.g., `DEV`, `production`).
*   `COMPILE_ROUTE_VERBOSE`: Set to `1` to enable verbose route compilation logging.
*   `COMPILE_ROUTE_MUTE`: Set to `1` to mute route compilation logging.
*   `REDIS_USERNAME`: The username for Redis.
*   `REDIS_PORT`: The port for the Redis instance.
*   `REDIS_PASSWORD`: The password for the Redis instance.
*   `REDIS_SESSION_DB`: The Redis database number for session storage.

## Running with Docker

To run the application and its dependencies (like Redis) using Docker:

1.  Ensure you have Docker and Docker Compose installed.
2.  Make sure your `.env` file is configured correctly.
3.  Run the following command:

    ```bash
    docker-compose up -d
    ```

This will start the application and a Redis container.

## Testing

To run the test suite:

```bash
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

To see test coverage:

```bash
npm run test:cov
```

To run end-to-end tests:

```bash
npm run test:e2e
```

## License

This project is [UNLICENSED](LICENSE).
