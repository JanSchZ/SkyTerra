import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch


def add_box(ax, x, y, w, h, text, facecolor="#1f2937", edgecolor="#93c5fd", textcolor="white", fontsize=10, radius=0.06):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.02,rounding_size={radius}",
        linewidth=1.4,
        edgecolor=edgecolor,
        facecolor=facecolor,
    )
    ax.add_patch(box)
    ax.text(x + w / 2, y + h / 2, text, ha='center', va='center', color=textcolor, fontsize=fontsize, wrap=True)
    return (x + w / 2, y + h / 2)


def add_diamond(ax, x, y, w, h, text, facecolor="#0b1220", edgecolor="#fbbf24", textcolor="white", fontsize=10):
    # Create a diamond by connecting midpoints
    verts = [
        (x + w / 2, y + h),      # top
        (x + w, y + h / 2),      # right
        (x + w / 2, y),          # bottom
        (x, y + h / 2),          # left
        (x + w / 2, y + h),
    ]
    xs, ys = zip(*verts)
    ax.plot(xs, ys, color=edgecolor, linewidth=1.6)
    ax.fill(xs, ys, facecolor=facecolor, alpha=0.95)
    ax.text(x + w / 2, y + h / 2, text, ha='center', va='center', color=textcolor, fontsize=fontsize, wrap=True)
    return (x + w / 2, y + h / 2)


def connect(ax, p1, p2, text=None, color="#9ca3af", fontsize=9, style='simple', arrowstyle='-|>', shrinkA=6, shrinkB=6):
    arrow = FancyArrowPatch(
        p1, p2,
        arrowstyle=arrowstyle,
        mutation_scale=12,
        linewidth=1.2,
        color=color,
        connectionstyle="arc3,rad=0.0",
        shrinkA=shrinkA, shrinkB=shrinkB,
    )
    ax.add_patch(arrow)
    if text:
        mx = (p1[0] + p2[0]) / 2
        my = (p1[1] + p2[1]) / 2
        ax.text(mx, my + 0.25, text, ha='center', va='bottom', color=color, fontsize=fontsize, bbox=dict(boxstyle='round,pad=0.15', fc='#0b1220', ec='none', alpha=0.7))


def draw_flow(output_png="docs/search_flow.png", output_svg="docs/search_flow.svg"):
    fig = plt.figure(figsize=(16, 9), facecolor="#0b1220")
    ax = fig.add_subplot(111)
    ax.set_facecolor("#0b1220")
    ax.set_xlim(0, 20)
    ax.set_ylim(0, 12)
    ax.axis('off')

    # Columns helper (frontend, backend, external)
    # Frontend band
    ax.text(3.5, 11.6, "Frontend", color="#a7f3d0", fontsize=12, ha='center')
    ax.plot([0.5, 9.5], [11.3, 11.3], color="#1f2937", linewidth=2)
    # Backend band
    ax.text(13.0, 11.6, "Backend", color="#fde68a", fontsize=12, ha='center')
    ax.plot([9.5, 16.5], [11.3, 11.3], color="#1f2937", linewidth=2)
    # External band
    ax.text(18.25, 11.6, "APIs externas", color="#93c5fd", fontsize=12, ha='center')
    ax.plot([16.5, 19.5], [11.3, 11.3], color="#1f2937", linewidth=2)

    # Frontend nodes
    A = add_box(ax, 1.0, 10.2, 6.0, 0.9, "Usuario escribe consulta", facecolor="#111827")
    B = add_box(ax, 1.0, 8.9, 6.0, 0.9, "AISearchBar (React)", facecolor="#111827")
    C = add_diamond(ax, 1.2, 7.4, 5.6, 1.0, "¿Saludo? (hola, hi, etc.)")
    D = add_box(ax, 1.0, 6.0, 6.0, 0.9, "Respuesta chat local", facecolor="#0f172a")
    E = add_diamond(ax, 1.2, 4.6, 5.6, 1.0, "¿≤3 palabras y sin\npalabras de propiedad?")
    F = add_diamond(ax, 1.2, 3.1, 5.6, 1.0, "¿Ubicación predefinida?")
    G = add_box(ax, 1.0, 1.7, 6.0, 0.9, "FlyTo en mapa\n(onLocationSearch)", facecolor="#0f172a")

    # External Mapbox
    H = add_box(ax, 16.7, 7.0, 2.0, 1.0, "Mapbox\nGeocoding API", facecolor="#0f172a", edgecolor="#93c5fd")
    I = add_diamond(ax, 6.8, 2.2, 3.8, 1.0, "¿Relevancia ≥ 0.8?")

    # Backend nodes
    J = add_box(ax, 10.0, 9.3, 6.0, 0.9, "POST /api/ai-search", facecolor="#111827", edgecolor="#fde68a")
    K = add_box(ax, 10.0, 8.0, 6.0, 0.9, "AISearchView (DRF)", facecolor="#111827", edgecolor="#fde68a")
    L = add_box(ax, 10.0, 6.7, 6.0, 0.9, "properties.services.\nsearch_properties_with_ai", facecolor="#111827", edgecolor="#fde68a")
    M = add_box(ax, 10.0, 5.4, 6.0, 0.9, "SamService.router →\nmodelo (lite/flash/pro)", facecolor="#111827", edgecolor="#fde68a")
    N = add_box(ax, 16.7, 5.4, 2.0, 1.0, "Gemini API\n(generateContent)", facecolor="#0f172a", edgecolor="#93c5fd")
    O = add_box(ax, 10.0, 4.1, 6.0, 0.9, "JSON: {search_mode,\nflyToLocation, recommendations}", facecolor="#0f172a", edgecolor="#fde68a")
    P = add_diamond(ax, 10.2, 2.7, 5.6, 1.0, "search_mode")
    Q = add_box(ax, 9.8, 1.3, 4.0, 0.9, "Enriquecer con DB\n→ recomendaciones reales", facecolor="#0f172a", edgecolor="#fde68a")
    R = add_box(ax, 13.8, 1.3, 2.2, 0.9, "Mensaje\n(asistente)", facecolor="#0f172a", edgecolor="#fde68a")

    # Connections (Frontend path)
    connect(ax, A, B)
    connect(ax, B, C)
    connect(ax, C, D, text="Sí")
    connect(ax, C, (E[0], C[1]-1.0), text="No")
    connect(ax, (E[0], C[1]-1.0), E)
    connect(ax, E, F, text="Sí")
    # Predefined → FlyTo
    connect(ax, F, G, text="Sí")
    # Predefined No → Mapbox
    connect(ax, F, (H[0], F[1]+0.2), text="No")
    connect(ax, (H[0], F[1]+0.2), H)
    # Mapbox → Confidence
    connect(ax, (6.8, 2.7), I)  # route from mapbox area to decision
    # Confidence Yes → FlyTo
    connect(ax, I, (G[0], I[1]-0.4), text="Sí")
    connect(ax, (G[0], I[1]-0.4), G)
    # Confidence No → Backend AI
    connect(ax, I, J, text="No")
    # If not short/location-like → Backend AI
    connect(ax, E, J, text="No")

    # Backend chain
    connect(ax, J, K)
    connect(ax, K, L)
    connect(ax, L, M)
    connect(ax, M, N)
    connect(ax, N, O)
    connect(ax, O, P)
    # Modes
    connect(ax, P, Q, text="property_recommendation")
    connect(ax, P, G, text="location")
    connect(ax, P, R, text="chat")

    # Auto-fly to first recommendation (App behavior)
    ax.text(7.2, 0.3, "Si hay recomendaciones: el App vuela a la 1ª automáticamente", color="#93c5fd", fontsize=9)
    connect(ax, Q, (G[0], G[1]+0.9), text="auto‑fly 1ª recomendación")

    # UI outputs
    connect(ax, Q, (6.0, 1.0))  # towards frontend area
    ax.text(5.4, 0.7, "UI: botón 'Ver Propiedades Recomendadas'", color="#9ca3af", fontsize=9)
    connect(ax, R, (7.0, 0.9))
    ax.text(6.5, 0.6, "UI: respuesta conversacional", color="#9ca3af", fontsize=9)

    # Title
    ax.text(10, 11.9, "SkyTerra – Flujo de Búsqueda (Mapbox + IA)", ha='center', va='center', color='white', fontsize=16, weight='bold')

    # Save outputs
    fig.tight_layout(pad=0.6)
    plt.savefig(output_png, dpi=220, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.savefig(output_svg, bbox_inches='tight', facecolor=fig.get_facecolor())
    print(f"Diagrama guardado en: {output_png} y {output_svg}")


if __name__ == "__main__":
    draw_flow()


def draw_simple_router(output_png="docs/search_flow_simple_router.png", output_svg="docs/search_flow_simple_router.svg"):
    fig = plt.figure(figsize=(14, 8), facecolor="#0b1220")
    ax = fig.add_subplot(111)
    ax.set_facecolor("#0b1220")
    ax.set_xlim(0, 20)
    ax.set_ylim(0, 12)
    ax.axis('off')

    # Title
    ax.text(10, 11.5, "Cómo decide Sam qué modelo de IA usar", ha='center', va='center', color='white', fontsize=18, weight='bold')
    ax.text(10, 10.7, "Objetivo: respuesta rápida cuando es simple, y más profunda cuando es compleja", ha='center', va='center', color='#9ca3af', fontsize=11)

    # User and Sam
    u = add_box(ax, 1.0, 8.6, 5.6, 1.1, "Usuario: escribe una consulta", facecolor="#111827")
    sam = add_box(ax, 7.0, 8.6, 5.8, 1.1, "Sam: lee la consulta y la clasifica", facecolor="#111827")

    connect(ax, u, sam)

    # Router decision
    d = add_diamond(ax, 7.3, 6.8, 5.2, 1.4, "¿Qué tan compleja es la tarea?")
    connect(ax, sam, d)

    # Three model options
    lite = add_box(ax, 2.0, 4.6, 5.4, 1.1, "Gemini 2.5 Flash-Lite\nRápido y económico\nPara saludos, preguntas breves, tareas simples", facecolor="#0f172a", edgecolor="#93c5fd")
    flash = add_box(ax, 7.5, 4.6, 5.0, 1.1, "Gemini 2.5 Flash\nEquilibrado (velocidad + calidad)\nPara búsquedas normales y resúmenes", facecolor="#0f172a", edgecolor="#60a5fa")
    pro = add_box(ax, 13.2, 4.6, 5.2, 1.1, "Gemini 2.5 Pro\nMayor razonamiento y precisión\nPara consultas complejas o largas", facecolor="#0f172a", edgecolor="#fbbf24")

    connect(ax, (d[0]-0.1, d[1]-0.2), (lite[0], lite[1]+0.9), text="Baja complejidad")
    connect(ax, d, (flash[0], flash[1]+0.9), text="Media complejidad")
    connect(ax, (d[0]+0.1, d[1]-0.2), (pro[0], pro[1]+0.9), text="Alta complejidad")

    # Outputs
    out = add_box(ax, 7.2, 2.6, 5.6, 1.1, "Sam devuelve la respuesta\n(ubicación, propiedades o mensaje)", facecolor="#0f172a", edgecolor="#34d399")
    connect(ax, (lite[0], lite[1]-0.6), (out[0]-2.4, out[1]+0.9))
    connect(ax, (flash[0], flash[1]-0.6), (out[0], out[1]+0.9))
    connect(ax, (pro[0], pro[1]-0.6), (out[0]+2.4, out[1]+0.9))

    # Notes (non-technical)
    ax.text(2.0, 1.2, "- Si es un saludo o algo corto: Sam prioriza velocidad (Flash-Lite)", color="#9ca3af", fontsize=10)
    ax.text(2.0, 0.8, "- Si es una búsqueda normal: usa Flash para buen balance", color="#9ca3af", fontsize=10)
    ax.text(2.0, 0.4, "- Si requiere pensar mucho o es larga: usa Pro", color="#9ca3af", fontsize=10)

    fig.tight_layout(pad=0.6)
    plt.savefig(output_png, dpi=220, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.savefig(output_svg, bbox_inches='tight', facecolor=fig.get_facecolor())
    print(f"Diagrama simple guardado en: {output_png} y {output_svg}")



