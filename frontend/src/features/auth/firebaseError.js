// Maps Firebase Auth error codes to friendly messages for the login/register forms.
const MESSAGES = {
	"auth/invalid-email": "That email address is not valid.",
	"auth/invalid-credential": "Wrong email or password.",
	"auth/user-not-found": "Wrong email or password.",
	"auth/wrong-password": "Wrong email or password.",
	"auth/email-already-in-use": "An account with that email already exists.",
	"auth/weak-password": "Password must be at least 6 characters.",
	"auth/too-many-requests": "Too many attempts — please try again later.",
	"auth/network-request-failed": "Network error — check your connection.",
};

export function authErrorMessage(err) {
	return MESSAGES[err?.code] ?? "Something went wrong. Please try again.";
}
