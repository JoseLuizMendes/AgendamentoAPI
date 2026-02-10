import { NotFoundError, ValidationError } from "../../errors.js";
import { calculateAvailableSlots } from "../../../lib/slots.js";
import { assertIsoDate, toDayOfWeekUtc } from "../../../lib/time.js";
export async function getAvailableSlots(repos, input) {
    try {
        assertIsoDate(input.date);
    }
    catch (e) {
        throw new ValidationError(e.message);
    }
    const service = await repos.services.getById(input.serviceId);
    if (!service) {
        throw new NotFoundError("Serviço não encontrado");
    }
    const dayOfWeek = toDayOfWeekUtc(input.date);
    const business = await repos.businessHours.getByDayOfWeek(dayOfWeek);
    const override = await repos.businessDateOverrides.getByDate(input.date);
    const appointments = await repos.appointments.listScheduledWithinDate(input.date);
    return calculateAvailableSlots({
        date: input.date,
        serviceDurationMinutes: service.durationInMinutes,
        intervalMinutes: input.intervalMinutes,
        business: override?.isOff
            ? null
            : business
                ? {
                    openTime: override?.openTime ?? business.openTime,
                    closeTime: override?.closeTime ?? business.closeTime,
                    isOff: override?.isOff ?? business.isOff,
                    breaks: business.breaks,
                }
                : null,
        appointments,
    });
}
//# sourceMappingURL=getAvailableSlots.js.map