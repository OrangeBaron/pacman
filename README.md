# Pacman VR FPS 👻🔫

## Concept e Panoramica

**Pacman VR FPS** è una rivisitazione in prima persona (FPS) a tema dark-survival-horror del celebre arcade. Sviluppato per la Realtà Virtuale utilizzando **WebXR** e **Three.js**, il gioco ti cala all'interno di un labirinto oscuro e claustrofobico generato proceduralmente, dove dovrai raccogliere tutte le monete sfuggendo all'inseguimento di quattro implacabili entità.

Il gioco è completamente giocabile sia con i **visori VR** che in modalità **"Flat" tradizionale** (su PC tramite WASD e mouse).

---

## 🎮 Obiettivo e Dinamiche di Gioco

Il tuo scopo è esplorare il labirinto per **raccogliere tutte le monete** sparse per la mappa. Se riesci a ripulire il livello, vincerai la partita. Tuttavia, il labirinto è pattugliato dai Fantasmi: farti toccare da uno di essi comporterà un **Game Over** istantaneo.

### 🤫 Meccaniche Stealth e Audio

Il suono e l'infiltrazione sono i fulcri dell'esperienza:

- **Audio 3D Spaziale:** Ogni entità ed evento produce un suono posizionato nello spazio 3D, aiutandoti a capire da che direzione provengono le minacce.
- **Rumori Bassi:** Raccogliere le monete emette un leggero suono. I fantasmi nelle vicinanze potrebbero insospettirsi.
- **Rumori Alti:** Utilizzare armi da fuoco o raccogliere armi speciali genera un forte baccano, allertando le IA presenti su un raggio molto più ampio.

### 🧠 L'Intelligenza Artificiale (I Fantasmi)

I fantasmi non si muovono casualmente, ma sono guidati dall'algoritmo di **Pathfinding A*** e seguono diversi "stati" comportamentali:

1. **🔵 Pattugliamento (Luce Azzurra):** I fantasmi vagano per il labirinto.
2. **🟡 Indagine (Luce Gialla):** Se avvertono un rumore o un'anomalia, cambiano espressione e si dirigono verso l'origine del suono per investigare.
3. **🔴 Caccia (Luce Rossa):** Quando vieni individuato nel loro cono visivo, il loro volto si fa aggressivo e inizieranno a inseguirti aumentando la velocità, cambiando il tema musicale della partita.
4. **🌀 Stordimento (Colore Blu / Volto Frastornato):** Se spari a un fantasma, questo diventerà inoffensivo e scapperà velocemente verso il centro del labirinto per rigenerarsi, per poi tornare in pattugliamento.

### 🔫 Armi e Combattimento

Per difenderti, avrai a disposizione un arsenale:

- **Pistola Base:** Hai munizioni infinite, ma un rateo di fuoco lento. Spara solo se strettamente necessario, poiché il rinculo e il rumore possono svelare la tua posizione.
- **Armi Speciali (Fucile d'Assalto):** Generati proceduralmente ai bordi della mappa. Offrono fuoco automatico, ottimi per sfuggire ad agguati multipli, ma hanno solo 30 colpi. Una volta esauriti, tornerai alla pistola.

### 📊 End-Game e Tabellone

Al termine della partita, sia in caso di vittoria che di sconfitta, un tabellone tridimensionale apparirà fluttuando davanti a te, mostrando le tue statistiche, incluse le volte in cui sei stato scoperto e la precisione di fuoco.

---

## 🛠️ Stack Tecnologico e Dettagli

- **Grafica Low-Poly Cel-Shaded:** Stile pulito, senza luci dinamiche native per garantire performance ottimali (90+ fps in VR).
- **Custom Shaders:** L'illuminazione ambientale, le torce delle armi e la luce emessa dai fantasmi sono calcolate tramite uno **ShaderMaterial** personalizzato (Fragment Shader). Questo include il **Projective Texturing**, che calcola in tempo reale gli ostacoli per simulare le ombre in maniera estremamente economica sulle risorse hardware.
- **Mappe Procedurali:** I labirinti vengono generati casualmente ad ogni partita tramite l'algoritmo *Recursive Backtracking* modificato per introdurre dei "loop" ciclici per favorire il gameplay.

---

## 🕹️ Controlli

**Per PC (Modalità Flat):**

- Clicca sullo schermo per iniziare e bloccare il cursore.
- **W, A, S, D**: Movimento.
- **Mouse**: Visuale / Mira.
- **Tasto Sinistro Mouse**: Spara.

**Per Visori VR:**

- Clicca sul pulsante in basso `ENTER VR`.
- **Levetta Analogica Sinistra**: Movimento.
- **Levetta Analogica Destra**: Rotazione a scatti (Snap Turn).
- **Grilletto Destro**: Spara.
