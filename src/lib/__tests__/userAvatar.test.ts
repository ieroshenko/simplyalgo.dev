import { describe, it, expect } from 'vitest';
import { getUserName, getUserInitials, getUserAvatarUrl } from '../userAvatar';

describe('getUserName', () => {
    it('should return full_name from user metadata', () => {
        const user = { user_metadata: { full_name: 'John Doe' } };
        expect(getUserName(user)).toBe('John Doe');
    });

    it('should return name from profile if no user metadata', () => {
        const profile = { name: 'Jane Smith' };
        expect(getUserName(undefined, profile)).toBe('Jane Smith');
    });

    it('should return "User" as default', () => {
        expect(getUserName()).toBe('User');
        expect(getUserName(undefined, undefined)).toBe('User');
    });

    it('should prefer user metadata over profile', () => {
        const user = { user_metadata: { full_name: 'From User' } };
        const profile = { name: 'From Profile' };
        expect(getUserName(user, profile)).toBe('From User');
    });
});

describe('getUserInitials', () => {
    it('should return initials from full name', () => {
        expect(getUserInitials('John Doe')).toBe('JD');
    });

    it('should return single initial for single name', () => {
        expect(getUserInitials('John')).toBe('J');
    });

    it('should handle multiple names (take first two)', () => {
        expect(getUserInitials('John Michael Doe')).toBe('JM');
    });

    it('should return "U" for empty string', () => {
        expect(getUserInitials('')).toBe('U');
    });

    it('should return "U" for whitespace only', () => {
        expect(getUserInitials('   ')).toBe('U');
    });

    it('should handle extra whitespace between names', () => {
        expect(getUserInitials('John   Doe')).toBe('JD');
    });

    it('should uppercase initials', () => {
        expect(getUserInitials('john doe')).toBe('JD');
    });
});

describe('getUserAvatarUrl', () => {
    it('should return provider avatar URL from user metadata', () => {
        const user = { user_metadata: { avatar_url: 'https://google.com/avatar.jpg' } };
        expect(getUserAvatarUrl(user)).toBe('https://google.com/avatar.jpg');
    });

    it('should return profile avatar URL if no user metadata avatar', () => {
        const profile = { avatarUrl: 'https://profile.com/avatar.jpg' };
        expect(getUserAvatarUrl(undefined, profile)).toBe('https://profile.com/avatar.jpg');
    });

    it('should return generated avatar URL as fallback', () => {
        const user = { user_metadata: { full_name: 'John Doe' } };
        const url = getUserAvatarUrl(user);
        expect(url).toContain('ui-avatars.com');
        expect(url).toContain('name=JD');
    });

    it('should use custom size in generated URL', () => {
        const url = getUserAvatarUrl(undefined, undefined, 120);
        expect(url).toContain('size=120');
    });

    it('should use default size of 80', () => {
        const url = getUserAvatarUrl();
        expect(url).toContain('size=80');
    });

    it('should prefer user metadata avatar over profile', () => {
        const user = { user_metadata: { avatar_url: 'https://user.com/avatar.jpg' } };
        const profile = { avatarUrl: 'https://profile.com/avatar.jpg' };
        expect(getUserAvatarUrl(user, profile)).toBe('https://user.com/avatar.jpg');
    });
});
