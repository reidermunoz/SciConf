// Íconos SVG simples para el menú (trazo con el color del texto)
function Icon({ children, className = "size-5" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    )
}

export const HomeIcon = (props) => (
    <Icon {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></Icon>
);

export const ChartIcon = (props) => (
    <Icon {...props}><path d="M3 3v18h18M7 15v-4M12 15V7M17 15v-6" /></Icon>
);

export const UsersIcon = (props) => (
    <Icon {...props}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M17 5.5a2.5 2.5 0 0 1 0 5M18 14c2 .5 3.5 2.2 3.5 4.5" />
    </Icon>
);

export const DocumentIcon = (props) => (
    <Icon {...props}><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" /></Icon>
);

export const LayersIcon = (props) => (
    <Icon {...props}><path d="M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5" /></Icon>
);

export const CalendarIcon = (props) => (
    <Icon {...props}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
);

export const MenuIcon = (props) => (
    <Icon {...props}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
);

export const CloseIcon = (props) => (
    <Icon {...props}><path d="M6 6l12 12M18 6 6 18" /></Icon>
);
