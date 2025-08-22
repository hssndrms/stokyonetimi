
export const findById = <T extends { id: string },>(arr: T[], id: string | undefined): T | undefined => arr.find(item => item.id === id);
