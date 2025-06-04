export const freeDeletionTreshold = 10;
export const superAdmins = process.env.superadmins
    ?.replace(/\s/g, '')
    ?.split(',')
    ?.map(parseInt);

export const premiumDuration = 1000 * 60 * 60 * 24 * 30; // 30 days
