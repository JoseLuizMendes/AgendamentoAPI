import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/rbac", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  
  let ownerToken: string;
  let staffToken: string;
  let customerToken: string;
  let tenantId: number;
  let serviceId: number;

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

    // Create tenant and owner
    const signup = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        email: "owner@example.com",
        password: "password123",
        name: "Owner",
        tenantName: "Test Tenant",
        tenantSlug: "test-tenant",
      },
    });
    const ownerResult = signup.json();
    ownerToken = ownerResult.token;
    tenantId = ownerResult.user.tenantId;

    // Create staff user
    const createStaff = await app.inject({
      method: "POST",
      url: "/users",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        email: "staff@example.com",
        password: "password123",
        name: "Staff Member",
        role: "STAFF",
      },
    });
    expect(createStaff.statusCode).toBe(201);
    
    // Login as staff
    const loginStaff = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "staff@example.com",
        password: "password123",
        tenantSlug: "test-tenant",
      },
    });
    const staffResult = loginStaff.json();
    staffToken = staffResult.token;

    // Create customer user
    const createCustomer = await app.inject({
      method: "POST",
      url: "/users",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        email: "customer@example.com",
        password: "password123",
        name: "Customer",
        role: "CUSTOMER",
      },
    });
    expect(createCustomer.statusCode).toBe(201);
    
    // Login as customer
    const loginCustomer = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "customer@example.com",
        password: "password123",
        tenantSlug: "test-tenant",
      },
    });
    const customerResult = loginCustomer.json();
    customerToken = customerResult.token;

    // Create a service for testing
    const createService = await app.inject({
      method: "POST",
      url: "/services",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: "Test Service",
        priceInCents: 5000,
        durationInMinutes: 60,
      },
    });
    const service = createService.json();
    serviceId = service.id;
  });

  describe("Service Management Permissions", () => {
    it("OWNER can create, update, and delete services", async () => {
      // Create
      const create = await app.inject({
        method: "POST",
        url: "/services",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          name: "New Service",
          priceInCents: 3000,
          durationInMinutes: 30,
        },
      });
      expect(create.statusCode).toBe(201);
      const newService = create.json();

      // Update
      const update = await app.inject({
        method: "PUT",
        url: `/services/${newService.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          name: "Updated Service",
        },
      });
      expect(update.statusCode).toBe(200);

      // Delete
      const del = await app.inject({
        method: "DELETE",
        url: `/services/${newService.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(del.statusCode).toBe(204);
    });

    it("STAFF can create services but not update or delete", async () => {
      // Can create
      const create = await app.inject({
        method: "POST",
        url: "/services",
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          name: "Staff Service",
          priceInCents: 2000,
          durationInMinutes: 45,
        },
      });
      expect(create.statusCode).toBe(201);

      // Cannot update
      const update = await app.inject({
        method: "PUT",
        url: `/services/${serviceId}`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          name: "Updated Name",
        },
      });
      expect(update.statusCode).toBe(403);

      // Cannot delete
      const del = await app.inject({
        method: "DELETE",
        url: `/services/${serviceId}`,
        headers: { authorization: `Bearer ${staffToken}` },
      });
      expect(del.statusCode).toBe(403);
    });

    it("CUSTOMER cannot create, update, or delete services", async () => {
      // Cannot create
      const create = await app.inject({
        method: "POST",
        url: "/services",
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          name: "Customer Service",
          priceInCents: 1000,
          durationInMinutes: 30,
        },
      });
      expect(create.statusCode).toBe(403);

      // Cannot update
      const update = await app.inject({
        method: "PUT",
        url: `/services/${serviceId}`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          name: "Updated Name",
        },
      });
      expect(update.statusCode).toBe(403);

      // Cannot delete
      const del = await app.inject({
        method: "DELETE",
        url: `/services/${serviceId}`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(del.statusCode).toBe(403);
    });
  });

  describe("Appointment Permissions", () => {
    it("CUSTOMER can only see their own appointments", async () => {
      // Customer creates appointment
      const createOwn = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          customerName: "Customer",
          customerPhone: "111111111",
          serviceId: serviceId,
          startTime: "2026-02-15T10:00:00.000Z",
        },
      });
      expect(createOwn.statusCode).toBe(201);

      // Owner creates another appointment
      await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          customerName: "Owner Appointment",
          customerPhone: "222222222",
          serviceId: serviceId,
          startTime: "2026-02-15T14:00:00.000Z",
        },
      });

      // Customer lists appointments - should only see their own
      const list = await app.inject({
        method: "GET",
        url: "/appointments",
        headers: { authorization: `Bearer ${customerToken}` },
      });
      const appointments = list.json();
      expect(appointments).toHaveLength(1);
      expect(appointments[0].customerName).toBe("Customer");
    });

    it("CUSTOMER can cancel their own appointment but not others", async () => {
      // Customer creates appointment
      const create = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          customerName: "Customer",
          customerPhone: "111111111",
          serviceId: serviceId,
          startTime: "2026-02-15T10:00:00.000Z",
        },
      });
      const ownAppt = create.json();

      // Owner creates another appointment
      const createOther = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          customerName: "Owner Appointment",
          customerPhone: "222222222",
          serviceId: serviceId,
          startTime: "2026-02-15T14:00:00.000Z",
        },
      });
      const otherAppt = createOther.json();

      // Customer can cancel their own
      const cancelOwn = await app.inject({
        method: "PATCH",
        url: `/appointments/${ownAppt.id}`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          status: "CANCELED",
        },
      });
      expect(cancelOwn.statusCode).toBe(200);

      // Customer cannot access other's appointment
      const cancelOther = await app.inject({
        method: "PATCH",
        url: `/appointments/${otherAppt.id}`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          status: "CANCELED",
        },
      });
      expect(cancelOther.statusCode).toBe(404);
    });

    it("OWNER and STAFF can see and manage all appointments", async () => {
      // Create appointments with different users
      await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          customerName: "Customer Appointment",
          customerPhone: "111111111",
          serviceId: serviceId,
          startTime: "2026-02-15T10:00:00.000Z",
        },
      });

      // Owner lists all appointments
      const ownerList = await app.inject({
        method: "GET",
        url: "/appointments",
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(ownerList.statusCode).toBe(200);
      const ownerAppointments = ownerList.json();
      expect(ownerAppointments.length).toBeGreaterThan(0);

      // Staff lists all appointments
      const staffList = await app.inject({
        method: "GET",
        url: "/appointments",
        headers: { authorization: `Bearer ${staffToken}` },
      });
      expect(staffList.statusCode).toBe(200);
      const staffAppointments = staffList.json();
      expect(staffAppointments.length).toBeGreaterThan(0);
    });
  });

  describe("Business Hours Permissions", () => {
    it("only OWNER can manage business hours", async () => {
      // OWNER can create
      const ownerCreate = await app.inject({
        method: "POST",
        url: "/hours",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          dayOfWeek: 1,
          openTime: "09:00",
          closeTime: "17:00",
        },
      });
      expect(ownerCreate.statusCode).toBe(201);
      const hours = ownerCreate.json();

      // STAFF cannot create
      const staffCreate = await app.inject({
        method: "POST",
        url: "/hours",
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          dayOfWeek: 2,
          openTime: "09:00",
          closeTime: "17:00",
        },
      });
      expect(staffCreate.statusCode).toBe(403);

      // CUSTOMER cannot create
      const customerCreate = await app.inject({
        method: "POST",
        url: "/hours",
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          dayOfWeek: 3,
          openTime: "09:00",
          closeTime: "17:00",
        },
      });
      expect(customerCreate.statusCode).toBe(403);

      // STAFF cannot update
      const staffUpdate = await app.inject({
        method: "PUT",
        url: `/hours/${hours.id}`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          openTime: "10:00",
        },
      });
      expect(staffUpdate.statusCode).toBe(403);

      // CUSTOMER cannot delete
      const customerDelete = await app.inject({
        method: "DELETE",
        url: `/hours/${hours.id}`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(customerDelete.statusCode).toBe(403);
    });
  });

  describe("User Management Permissions", () => {
    it("only OWNER can list and manage users", async () => {
      // OWNER can list users
      const ownerList = await app.inject({
        method: "GET",
        url: "/users",
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(ownerList.statusCode).toBe(200);

      // STAFF cannot list users
      const staffList = await app.inject({
        method: "GET",
        url: "/users",
        headers: { authorization: `Bearer ${staffToken}` },
      });
      expect(staffList.statusCode).toBe(403);

      // CUSTOMER cannot list users
      const customerList = await app.inject({
        method: "GET",
        url: "/users",
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(customerList.statusCode).toBe(403);
    });

    it("users can view and update their own profile", async () => {
      // Get current customer user info
      const getMe = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(getMe.statusCode).toBe(200);
      const me = getMe.json();

      // Customer can view their own profile
      const viewOwn = await app.inject({
        method: "GET",
        url: `/users/${me.id}`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(viewOwn.statusCode).toBe(200);

      // Customer can update their own profile
      const updateOwn = await app.inject({
        method: "PUT",
        url: `/users/${me.id}`,
        headers: { authorization: `Bearer ${customerToken}` },
        payload: {
          name: "Updated Customer Name",
        },
      });
      expect(updateOwn.statusCode).toBe(200);
    });
  });
});
