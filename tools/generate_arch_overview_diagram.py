import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch


def add_box(ax, x, y, w, h, text, fc="#111827", ec="#60a5fa", tc="#ffffff", fs=11, radius=0.06):
    box = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0.02,rounding_size={radius}", linewidth=1.4, edgecolor=ec, facecolor=fc)
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', color=tc, fontsize=fs, wrap=True)
    return (x + w/2, y + h/2)


def connect(ax, p1, p2, text=None, color="#9ca3af"):
    arrow = FancyArrowPatch(p1, p2, arrowstyle='-|>', mutation_scale=12, linewidth=1.2, color=color, connectionstyle="arc3,rad=0.0", shrinkA=6, shrinkB=6)
    ax.add_patch(arrow)
    if text:
        mx = (p1[0] + p2[0]) / 2
        my = (p1[1] + p2[1]) / 2
        ax.text(mx, my + 0.25, text, ha='center', va='bottom', color=color, fontsize=10)


def draw_arch(output_png="docs/arch_overview.png", output_svg="docs/arch_overview.svg"):
    fig = plt.figure(figsize=(16, 9), facecolor="#0b1220")
    ax = fig.add_subplot(111)
    ax.set_facecolor("#0b1220")
    ax.set_xlim(0, 20)
    ax.set_ylim(0, 12)
    ax.axis('off')

    # Titles
    ax.text(10, 11.5, "SkyTerra – Estructura Global (Vista de Alto Nivel)", ha='center', va='center', color='white', fontsize=18, weight='bold')
    ax.text(10, 10.8, "Clientes → Borde → Backend (Django) → Datos y Servicios → Respuesta", ha='center', va='center', color='#9ca3af', fontsize=11)

    # Client apps
    web = add_box(ax, 1.2, 9.2, 4.6, 0.9, "Web (React/Vite)")
    mobile = add_box(ax, 1.2, 7.9, 4.6, 0.9, "App Móvil (Capacitor/Android)")

    # Edge & routing
    cdn = add_box(ax, 7.0, 9.8, 4.6, 0.9, "CDN / Hosting estático", fc="#0f172a", ec="#60a5fa")
    proxy = add_box(ax, 7.0, 8.5, 4.6, 0.9, "Nginx Reverse Proxy", fc="#0f172a", ec="#60a5fa")

    # Backend (Django)
    api = add_box(ax, 12.5, 9.8, 5.6, 0.9, "Django REST API", fc="#111827", ec="#fbbf24")
    auth = add_box(ax, 12.5, 8.5, 2.6, 0.9, "Auth / JWT", fc="#111827", ec="#fbbf24")
    props = add_box(ax, 15.5, 8.5, 2.6, 0.9, "Propiedades", fc="#111827", ec="#fbbf24")
    pay = add_box(ax, 12.5, 7.2, 2.6, 0.9, "Pagos", fc="#111827", ec="#fbbf24")
    ai = add_box(ax, 15.5, 7.2, 2.6, 0.9, "AI (Sam)", fc="#111827", ec="#fbbf24")

    # Data & external services
    db = add_box(ax, 12.5, 5.6, 2.6, 0.9, "DB (PostgreSQL/SQLite)", fc="#0f172a", ec="#34d399")
    files = add_box(ax, 15.5, 5.6, 2.6, 0.9, "Media/Static (S3/Local)", fc="#0f172a", ec="#34d399")
    stripe = add_box(ax, 12.5, 4.3, 2.6, 0.9, "Stripe", fc="#0f172a", ec="#34d399")
    mapbox = add_box(ax, 15.5, 4.3, 2.6, 0.9, "Mapbox", fc="#0f172a", ec="#34d399")
    gemini = add_box(ax, 14.0, 3.0, 2.6, 0.9, "Gemini API", fc="#0f172a", ec="#34d399")

    # Flows
    connect(ax, web, cdn)
    connect(ax, mobile, cdn)
    connect(ax, cdn, proxy)
    connect(ax, proxy, api)

    connect(ax, api, auth)
    connect(ax, api, props)
    connect(ax, api, pay)
    connect(ax, api, ai)

    connect(ax, props, db)
    connect(ax, api, files)
    connect(ax, pay, stripe)
    connect(ax, props, mapbox)
    connect(ax, ai, gemini)

    # Notes
    ax.text(2.0, 1.2, "- Web y App consumen la misma API.", color="#9ca3af", fontsize=10)
    ax.text(2.0, 0.8, "- Nginx enruta y protege el backend.", color="#9ca3af", fontsize=10)
    ax.text(2.0, 0.4, "- AI (Sam) llama a Gemini; Propiedades usan DB y Mapbox.", color="#9ca3af", fontsize=10)

    fig.tight_layout(pad=0.6)
    plt.savefig(output_png, dpi=220, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.savefig(output_svg, bbox_inches='tight', facecolor=fig.get_facecolor())
    print(f"Diagrama de arquitectura guardado en: {output_png} y {output_svg}")


if __name__ == "__main__":
    draw_arch()


