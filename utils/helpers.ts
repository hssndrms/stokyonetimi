
export const findById = <T extends { id: string },>(arr: T[], id: string | null | undefined): T | undefined => {
    if (id === null || id === undefined) {
        return undefined;
    }
    return arr.find(item => item.id === id);
};