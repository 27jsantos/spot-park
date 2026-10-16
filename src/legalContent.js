export const EFFECTIVE = "Effective October 16, 2026";
export const CONTACT = "parkauraapp@gmail.com";

export const PRIVACY_SECTIONS = [
  { p: ["Spot Aura (\"we\", \"us\") is an hourly parking marketplace. Drivers find and reserve parking spaces that fit their vehicle, and hosts list spaces they own or manage. This policy explains what information we collect, how we use it, and the choices you have."] },
  { h: "Information we collect", ul: [
    "Account information: your email address and password. Passwords are handled by our authentication provider and are never visible to us in readable form.",
    "Vehicle information: the vehicle name and body type you enter, used to estimate whether a space fits.",
    "Listing information (hosts): space name, price, hours, dimensions, location, and photos you upload.",
    "Reservations, messages and reviews: bookings you make or receive, messages between drivers and hosts, and ratings you leave.",
    "Location: with your permission, your device's approximate or precise location is used to center the map. You can decline or turn this off in your device settings and still search by address.",
    "Payment information: payments are processed by Stripe. Card details go directly to Stripe and are not stored on our servers. We receive confirmation of a payment and its amount.",
  ] },
  { h: "How we use information", ul: [
    "To create and secure your account and show you spaces.",
    "To process reservations and payments and notify you about bookings.",
    "To let drivers and hosts message each other about a reservation.",
    "To prevent fraud and abuse, and to fix problems.",
  ], p: ["We do not sell your personal information, and we do not use it for third-party advertising or cross-app tracking."] },
  { h: "Who we share information with", ul: [
    "Other users: a host sees the driver's email and booking details for a reservation, and a driver sees the space's listing details. Listings, photos and reviews are visible to other users.",
    "Service providers that run Spot Aura: Supabase (database, login and file storage), Stripe (payments), Resend (email notifications), Vercel (website hosting), and mapping services (OpenStreetMap, and Apple Maps on iPhone). Addresses you search for are sent to a geocoding service to find them on the map.",
    "Legal reasons: if required by law or to protect rights and safety.",
  ] },
  { h: "Retention and deleting your account", p: ["We keep your information while your account is active. You can delete your account at any time inside the app (the \"Delete my account\" link at the bottom of the home screen). Deleting your account permanently removes your account, your listed spaces, your reservations, reviews and messages. We may keep limited records where the law requires it, such as payment records held by Stripe. Deletion is blocked while you have an upcoming paid reservation, until it has passed."] },
  { h: "Security", p: ["We use industry-standard providers and encrypted connections. No system is perfectly secure, so we cannot guarantee absolute security."] },
  { h: "Children", p: ["Spot Aura is intended for people 18 and older. We do not knowingly collect information from children."] },
  { h: "Changes to this policy", p: ["We may update this policy and will change the effective date above when we do."] },
  { h: "Contact", p: ["Questions or requests about your data: " + CONTACT] },
];

export const TERMS_SECTIONS = [
  { p: ["By creating an account or using Spot Aura, you agree to these terms. If you do not agree, do not use the service."] },
  { h: "What Spot Aura is", p: ["Spot Aura is a platform that connects drivers looking for parking with hosts offering parking spaces. We are not the owner or operator of any space, and we are not a party to the arrangement between a driver and a host."] },
  { h: "Accounts", p: ["You must be 18 or older and provide accurate information. You are responsible for activity on your account and for keeping your password secure."] },
  { h: "For drivers", ul: [
    "The \"fit\" indicator is an estimate based on the dimensions entered by hosts and drivers. It is guidance only. Check the space yourself before parking.",
    "You park at your own risk. Follow the host's posted rules and the reserved time. Do not block access or exceed the reserved space.",
    "The price and any fees are shown before you pay.",
  ] },
  { h: "For hosts", ul: [
    "You confirm you have the right to offer the space (you own it, or have permission from the owner or landlord).",
    "Listing information, including dimensions, price, hours and photos, must be accurate and not misleading.",
    "You are responsible for following local laws, zoning rules, lease terms and any taxes that apply to income you earn.",
  ] },
  { h: "Payments and refunds", p: ["Payments are processed by Stripe. By paying, you authorize the charge shown at checkout. If you need a refund or have a problem with a booking, contact us at the email below and we will review it case by case. Long-term requests are sent to the host for approval."] },
  { h: "Acceptable use", p: ["Do not use Spot Aura to break the law, harass others, post false or harmful content, interfere with the service, or attempt to access other people's accounts or data. We may remove content or suspend accounts that violate these terms."] },
  { h: "Your content", p: ["You keep ownership of the photos and text you post. You give us permission to display them within Spot Aura so the service can work."] },
  { h: "Disclaimers and limits of liability", p: ["Spot Aura is provided \"as is\" without warranties of any kind. To the fullest extent allowed by law, we are not liable for vehicle damage, theft, injury, towing, fines, lost or unavailable spaces, or disputes between users, and our total liability to you is limited to the amount you paid through Spot Aura in the 12 months before the claim."] },
  { h: "Ending your account", p: ["You can delete your account in the app at any time. We may suspend or end accounts that violate these terms."] },
  { h: "Changes", p: ["We may update these terms and will change the effective date when we do. Continuing to use Spot Aura after a change means you accept it."] },
  { h: "Governing law", p: ["These terms are governed by the laws of the State of New York, without regard to conflict-of-law rules."] },
  { h: "Contact", p: [CONTACT] },
];
