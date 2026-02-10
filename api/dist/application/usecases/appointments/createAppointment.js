import { ConflictError, NotFoundError, ValidationError } from "../../errors.js";
import { addMinutes, assertIsoDate, toDayOfWeekUtc } from "../../../lib/time.js";
import { isSlotWithinBusinessHours } from "../../../lib/slots.js";
export async function createAppointment(tx, input) {
    return tx.runSerializable(async (repos) => {
        const service = await repos.services.getById(input.serviceId);
        if (!service) {
            throw new NotFoundError("Serviço não encontrado");
        }
        const endTime = addMinutes(input.startTime, service.durationInMinutes);
        const date = input.startTime.toISOString().slice(0, 10);
        try {
            assertIsoDate(date);
        }
        catch (e) {
            throw new ValidationError(e.message);
        }
        const dayOfWeek = toDayOfWeekUtc(date);
        const business = await repos.businessHours.getByDayOfWeek(dayOfWeek);
        const override = await repos.businessDateOverrides.getByDate(date);
        if (override?.isOff) {
            throw new ConflictError("Dia indisponível (fechado)");
        }
        const okBusiness = isSlotWithinBusinessHours({
            date,
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
            startTime: input.startTime,
            endTime,
        });
        if (!okBusiness) {
            throw new ValidationError("Horário fora da agenda configurada");
        }
        const conflict = await repos.appointments.findScheduledConflict({ startTime: input.startTime, endTime });
        if (conflict) {
            throw new ConflictError("Conflito: horário já ocupado");
        }
        return repos.appointments.create({
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            serviceId: input.serviceId,
            startTime: input.startTime,
            endTime,
        });
    });
}
//# sourceMappingURL=createAppointment.js.map