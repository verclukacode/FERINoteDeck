// Adds the authenticated user (set by requireAuth) to the Express request.
declare global {
	namespace Express {
		interface Request {
			user?: { uid: string; email: string };
		}
	}
}

export {};
