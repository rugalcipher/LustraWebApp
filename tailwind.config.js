/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        extend: {
            /**
             * Responsive typography tokens.
             *
             * Internal desktop pages were built at mobile sizes (0.6–0.75rem),
             * which reads as cramped on a 1440px console. These tokens grow with
             * the viewport via clamp() instead of each page hardcoding a size, so
             * mobile keeps the sizes that already work and desktop becomes
             * legible. Use `text-body` for copy, `text-helper` for hints,
             * `text-nav` for navigation labels and `text-meta` for timestamps and
             * secondary metadata.
             */
            fontSize: {
                // 13px mobile -> 16px at 1440px
                body: ['clamp(0.8125rem, 0.72rem + 0.30vw, 1rem)', { lineHeight: '1.6' }],
                // 12px -> 14px
                helper: ['clamp(0.75rem, 0.70rem + 0.16vw, 0.875rem)', { lineHeight: '1.55' }],
                // 12px -> 13.5px, wide tracking is applied separately
                nav: ['clamp(0.75rem, 0.71rem + 0.13vw, 0.8438rem)', { lineHeight: '1.4' }],
                // 11px -> 12.5px — the floor for anything a person must read
                meta: ['clamp(0.6875rem, 0.65rem + 0.12vw, 0.7813rem)', { lineHeight: '1.45' }],
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            colors: {
                noir: '#0B0B0D',
                'deep-black': '#080808',
                'elevated-black': '#111111',
                'card-black': '#171717',
                ivory: '#F6F4EF',
                'soft-ivory': '#D9D5CE',
                'rose-gold': '#B8876B',
                'light-rose-gold': '#D8AB91',
                'deep-rose': '#5E2D38',
                'muted-grey': '#8C8882',
                success: '#4F8A68',
                warning: '#B98A4A',
                error: '#A84E55',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))'
            },
            fontFamily: {
                heading: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
                body: ['"Jost"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
                mono: ['var(--font-mono)']
            },
            maxWidth: {
                'luxe': '520px'
            },
            keyframes: {
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' }
                },
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.96)' },
                    to: { opacity: '1', transform: 'scale(1)' }
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                },
                'slide-in-left': {
                    from: { transform: 'translateX(-100%)' },
                    to: { transform: 'translateX(0)' }
                },
                'ken-burns': {
                    '0%': { transform: 'scale(1.02) translate3d(0,0,0)' },
                    '100%': { transform: 'scale(1.12) translate3d(-1.5%, -1.5%, 0)' }
                }
            },
            animation: {
                'fade-in': 'fade-in 0.6s ease-out forwards',
                'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'scale-in': 'scale-in 0.4s ease-out forwards',
                'shimmer': 'shimmer 2s linear infinite',
                'slide-in-left': 'slide-in-left 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'ken-burns': 'ken-burns 9s ease-out forwards'
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
}
