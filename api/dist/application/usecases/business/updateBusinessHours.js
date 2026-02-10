export async function updateBusinessHours(repos, items) {
    await repos.businessHours.upsertMany(items);
}
//# sourceMappingURL=updateBusinessHours.js.map