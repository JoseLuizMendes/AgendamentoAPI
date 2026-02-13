import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/multi-tenancy", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  
  // Tenant A data
  let tenantAToken: string;
  let tenantAUserId: number;
  let tenantATenantId: number;
  
  // Tenant B data
  let tenantBToken: string;
  let tenantBUserId: number;
  let tenantBTenantId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await app.prisma.appointment.deleteMany();
    await app.prisma.businessBreak.deleteMany();
    await app.prisma.businessHours.deleteMany();
    await app.prisma.businessDateOverride.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();
  });

  describe("Tenant Isolation", () => {
    it("creates two separate tenants with signup", async () => {
      // Create Tenant A
      const signupA = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: "owner-a@example.com",
          password: "password123",
          name: "Owner A",
          tenantName: "Tenant A",
          tenantSlug: "tenant-a",
        },
      });

      expect(signupA.statusCode).toBe(201);
      const resultA = signupA.json();
      expect(resultA.user.role).toBe("OWNER");
      expect(resultA.tenant.slug).toBe("tenant-a");
      tenantAToken = resultA.token;
      tenantAUserId = resultA.user.id;
      tenantATenantId = resultA.user.tenantId;

      // Create Tenant B
      const signupB = await app.inject({
        method: "POST",
        url: "/auth/signup",
        payload: {
          email: "owner-b@example.com",
          password: "password456",
          name: "Owner B",
          tenantName: "Tenant B",
          tenantSlug: "tenant-b",
        },
      });

      expect(signupB.statusCode).toBe(201);
      const resultB = signupB.json();
      expect(resultB.user.role).toBe("OWNER");
      expect(resultB.tenant.slug).toBe("tenant-b");
      tenantBToken = resultB.token;
      tenantBUserId = resultB.user.id;
      tenantBTenantId = resultB.user.tenantId;

      // Verify tenants are different
      expect(tenantATenantId).not.toBe(tenantBTenantId);
    });

    it("tenant A cannot see tenant B services", async () => {
      // Setup: Create both tenants
      await setupTenants();

      // Tenant A creates a service
      const serviceA = await app.inject({
        method: "POST",
        url: "/services",
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
        payload: {
          name: "Service A",
          priceInCents: 1000,
          durationInMinutes: 30,
        },
      });
      expect(serviceA.statusCode).toBe(201);

      // Tenant B creates a service
      const serviceB = await app.inject({
        method: "POST",
        url: "/services",
        headers: {
          authorization: `Bearer ${tenantBToken}`,
        },
        payload: {
          name: "Service B",
          priceInCents: 2000,
          durationInMinutes: 60,
        },
      });
      expect(serviceB.statusCode).toBe(201);

      // Tenant A lists services - should only see their own
      const listA = await app.inject({
        method: "GET",
        url: "/services",
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      });
      expect(listA.statusCode).toBe(200);
      const servicesA = listA.json();
      expect(servicesA).toHaveLength(1);
      expect(servicesA[0].name).toBe("Service A");

      // Tenant B lists services - should only see their own
      const listB = await app.inject({
        method: "GET",
        url: "/services",
        headers: {
          authorization: `Bearer ${tenantBToken}`,
        },
      });
      expect(listB.statusCode).toBe(200);
      const servicesB = listB.json();
      expect(servicesB).toHaveLength(1);
      expect(servicesB[0].name).toBe("Service B");
    });

    it("tenant A cannot access tenant B service by ID", async () => {
      await setupTenants();

      // Tenant B creates a service
      const serviceB = await app.inject({
        method: "POST",
        url: "/services",
        headers: {
          authorization: `Bearer ${tenantBToken}`,
        },
        payload: {
          name: "Service B",
          priceInCents: 2000,
          durationInMinutes: 60,
        },
      });
      expect(serviceB.statusCode).toBe(201);
      const serviceBData = serviceB.json();

      // Tenant A tries to update Tenant B's service
      const updateAttempt = await app.inject({
        method: "PUT",
        url: `/services/${serviceBData.id}`,
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
        payload: {
          name: "Hacked Service",
        },
      });
      expect(updateAttempt.statusCode).toBe(404); // Should not find service

      // Tenant A tries to delete Tenant B's service
      const deleteAttempt = await app.inject({
        method: "DELETE",
        url: `/services/${serviceBData.id}`,
        headers: {
          authorization: `Bearer ${tenantAToken}`,
        },
      });
      expect(deleteAttempt.statusCode).toBe(404); // Should not find service
    });

    it("tenant A cannot see tenant B appointments", async () => {
      await setupTenants();

      // Create services for both tenants
      const serviceAResp = await app.inject({
        method: "POST",
        url: "/services",
        headers: { authorization: `Bearer ${tenantAToken}` },
        payload: {
          name: "Service A",
          priceInCents: 1000,
          durationInMinutes: 30,
        },
      });
      const serviceA = serviceAResp.json();

      const serviceBResp = await app.inject({
        method: "POST",
        url: "/services",
        headers: { authorization: `Bearer ${tenantBToken}` },
        payload: {
          name: "Service B",
          priceInCents: 2000,
          durationInMinutes: 60,
        },
      });
      const serviceB = serviceBResp.json();

      // Create appointments for both tenants
      await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${tenantAToken}` },
        payload: {
          customerName: "Customer A",
          customerPhone: "111111111",
          serviceId: serviceA.id,
          startTime: "2026-02-15T10:00:00.000Z",
        },
      });

      await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${tenantBToken}` },
        payload: {
          customerName: "Customer B",
          customerPhone: "222222222",
          serviceId: serviceB.id,
          startTime: "2026-02-15T10:00:00.000Z",
        },
      });

      // Tenant A lists appointments
      const listA = await app.inject({
        method: "GET",
        url: "/appointments",
        headers: { authorization: `Bearer ${tenantAToken}` },
      });
      const appointmentsA = listA.json();
      expect(appointmentsA).toHaveLength(1);
      expect(appointmentsA[0].customerName).toBe("Customer A");

      // Tenant B lists appointments
      const listB = await app.inject({
        method: "GET",
        url: "/appointments",
        headers: { authorization: `Bearer ${tenantBToken}` },
      });
      const appointmentsB = listB.json();
      expect(appointmentsB).toHaveLength(1);
      expect(appointmentsB[0].customerName).toBe("Customer B");
    });

    it("tenant A cannot see tenant B business hours", async () => {
      await setupTenants();

      // Tenant A creates business hours
      await app.inject({
        method: "POST",
        url: "/hours",
        headers: { authorization: `Bearer ${tenantAToken}` },
        payload: {
          dayOfWeek: 1,
          openTime: "09:00",
          closeTime: "17:00",
        },
      });

      // Tenant B creates business hours
      await app.inject({
        method: "POST",
        url: "/hours",
        headers: { authorization: `Bearer ${tenantBToken}` },
        payload: {
          dayOfWeek: 1,
          openTime: "10:00",
          closeTime: "18:00",
        },
      });

      // Tenant A lists business hours
      const listA = await app.inject({
        method: "GET",
        url: "/hours",
        headers: { authorization: `Bearer ${tenantAToken}` },
      });
      const hoursA = listA.json();
      expect(hoursA).toHaveLength(1);
      expect(hoursA[0].openTime).toBe("09:00");

      // Tenant B lists business hours
      const listB = await app.inject({
        method: "GET",
        url: "/hours",
        headers: { authorization: `Bearer ${tenantBToken}` },
      });
      const hoursB = listB.json();
      expect(hoursB).toHaveLength(1);
      expect(hoursB[0].openTime).toBe("10:00");
    });

    it("appointments do not conflict across tenants", async () => {
      await setupTenants();

      // Create same service for both tenants
      const serviceAResp = await app.inject({
        method: "POST",
        url: "/services",
        headers: { authorization: `Bearer ${tenantAToken}` },
        payload: {
          name: "Haircut",
          priceInCents: 5000,
          durationInMinutes: 60,
        },
      });
      const serviceA = serviceAResp.json();

      const serviceBResp = await app.inject({
        method: "POST",
        url: "/services",
        headers: { authorization: `Bearer ${tenantBToken}` },
        payload: {
          name: "Haircut",
          priceInCents: 5000,
          durationInMinutes: 60,
        },
      });
      const serviceB = serviceBResp.json();

      const startTime = "2026-02-15T10:00:00.000Z";

      // Tenant A creates appointment
      const apptA = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${tenantAToken}` },
        payload: {
          customerName: "Customer A",
          customerPhone: "111111111",
          serviceId: serviceA.id,
          startTime,
        },
      });
      expect(apptA.statusCode).toBe(201);

      // Tenant B creates appointment at same time - should succeed (different tenant)
      const apptB = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${tenantBToken}` },
        payload: {
          customerName: "Customer B",
          customerPhone: "222222222",
          serviceId: serviceB.id,
          startTime,
        },
      });
      expect(apptB.statusCode).toBe(201);

      // Tenant A tries to create another appointment at same time - should fail
      const apptA2 = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${tenantAToken}` },
        payload: {
          customerName: "Customer A2",
          customerPhone: "333333333",
          serviceId: serviceA.id,
          startTime,
        },
      });
      expect(apptA2.statusCode).toBe(409); // Conflict
    });
  });

  // Helper function to setup tenants
  async function setupTenants() {
    // Create Tenant A
    const signupA = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        email: "owner-a@example.com",
        password: "password123",
        name: "Owner A",
        tenantName: "Tenant A",
        tenantSlug: "tenant-a",
      },
    });
    const resultA = signupA.json();
    tenantAToken = resultA.token;
    tenantAUserId = resultA.user.id;
    tenantATenantId = resultA.user.tenantId;

    // Create Tenant B
    const signupB = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        email: "owner-b@example.com",
        password: "password456",
        name: "Owner B",
        tenantName: "Tenant B",
        tenantSlug: "tenant-b",
      },
    });
    const resultB = signupB.json();
    tenantBToken = resultB.token;
    tenantBUserId = resultB.user.id;
    tenantBTenantId = resultB.user.tenantId;
  }
});
