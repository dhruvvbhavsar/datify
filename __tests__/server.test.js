// __tests__/server.test.js
const request = require("supertest");
const app = require("../server");
const { sql } = require("../postgres");

beforeAll(async () => {
  const usersBeforeCleanup = await sql`select count(*) from "user"`;
  console.log(`Users before cleanup: ${usersBeforeCleanup[0].count}`);

  await sql`delete from "user"`;

  const usersAfterCleanup = await sql`select count(*) from "user"`;
  console.log(`Users after cleanup: ${usersAfterCleanup[0].count}`);

  const existingUser = {
    username: "existingUser",
    email: "existinguser@example.com",
    password: "password123",
  };

  const response = await request(app).post("/register").send(existingUser);
  existingUserToken = response.body.token;
}, 50000);

describe("GET /", () => {
  it("responds with welcome message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Welcome to Datify API!💖");
  });
});

describe("POST /register", () => {
  it("registers a new user", async () => {
    const newUser = {
      username: "newUser",
      email: "newuser@example.com",
      password: "password123",
    };

    const response = await request(app).post("/register").send(newUser);
    expect(response.status).toBe(201);
    expect(response.body.token).toBeDefined();
  });

  it("handles duplicate email or username", async () => {
    const existingUser = {
      username: "existingUser",
      email: "existinguser@example.com",
      password: "password123",
    };

    await request(app).post("/register").send(existingUser);

    const response = await request(app).post("/register").send(existingUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Email or username already exists");
  });
});

describe("POST /login", () => {
  it("logs in a user with valid credentials", async () => {
    const existingUser = {
      email: "existinguser@example.com",
      password: "password123",
    };

    const response = await request(app).post("/login").send(existingUser);
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it("handles invalid email or password", async () => {
    const invalidCredentials = {
      email: "nonexistent@example.com",
      password: "wrongpassword",
    };

    const response = await request(app).post("/login").send(invalidCredentials);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid email or password");
  });
});

describe("GET /dashboard", () => {
  it("returns dashboard data for an authenticated user", async () => {
    const newUser = {
      username: "dashboardUser",
      email: "dashboarduser@example.com",
      password: "password123",
    };

    const registerResponse = await request(app).post("/register").send(newUser);
    const token = registerResponse.body.token;

    const response = await request(app)
      .get("/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("dashboardUser");
  });

  it("handles unauthorized access", async () => {
    const response = await request(app).get("/dashboard");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("handles expired token", async () => {
    const newUser = {
      username: "expiredTokenUser",
      email: "expiredtokenuser@example.com",
      password: "password123",
    };

    const registerResponse = await request(app).post("/register").send(newUser);
    const token = registerResponse.body.token;

    const expiredToken = `${token.slice(0, -1)}0`; // Change the last digit of the token

    const response = await request(app)
      .get("/dashboard")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });
});

describe("Rate Limiting", () => {
  it("limits requests per IP within the specified window", async () => {
    const maxRequests = 15;
    const windowMs = 1 * 60 * 1000; // 1 minute
    const ip = "127.0.0.1";

    for (let i = 0; i < maxRequests + 5; i++) {
      await request(app).get("/").set("X-Forwarded-For", ip);
    }

    const response = await request(app).get("/").set("X-Forwarded-For", ip);

    expect(response.status).toBe(429);
    expect(response.body).toHaveProperty(
      "error",
      "Too many requests, please try again later"
    );
  });
});
