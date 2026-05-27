# Pacman VR FPS 👻🔫

## Concept e Panoramica

**Pacman VR FPS** è una rivisitazione in prima persona (FPS) a tema dark-survival-horror del celebre arcade. Sviluppato per la Realtà Virtuale utilizzando **WebXR** e **Three.js**, il gioco ti cala all'interno di un labirinto oscuro e claustrofobico generato proceduralmente, dove dovrai raccogliere tutte le monete sfuggendo all'inseguimento di implacabili entità.

Il gioco è completamente fruibile sia con i **visori VR** che in modalità **"Flat" tradizionale** su PC (tramite WASD e mouse).

🚀 **[Clicca qui per giocare a Pacman VR FPS!](https://orangebaron.github.io/pacman/)**

---

## 🎮 Obiettivo e Dinamiche di Gioco

Il tuo scopo è esplorare il labirinto per **raccogliere tutte le monete** sparse per la mappa. Se riesci a ripulire il livello, vincerai la partita. Tuttavia, il labirinto è pattugliato dai Fantasmi: farti toccare da uno di essi comporterà un **Game Over** istantaneo.

### ⚙️ Personalizzazione della Partita

Prima di ogni avvio, un Menu Principale permette di generare partite uniche regolando:

- Dimensione del labirinto.
- Quantità di fantasmi e di armi speciali spawnate.
- Velocità di movimento del giocatore e velocità di rotazione per il visore VR.
- Velocità di base e di caccia dei fantasmi.

### 🤫 Meccaniche Stealth e Audio

Il suono e l'infiltrazione sono i fulcri dell'esperienza:

- **Audio 3D Spaziale:** Ogni entità ed evento produce un suono posizionato nello spazio 3D, aiutandoti a capire da che direzione provengono le minacce.
- **Rumori Bassi:** Raccogliere le monete emette un leggero suono. I fantasmi nelle vicinanze potrebbero avvertire il rumore e insospettirsi.
- **Rumori Alti:** Utilizzare armi da fuoco o raccogliere armi speciali genera un forte baccano, allertando le IA presenti su un raggio molto più ampio.

### 🧠 L'Intelligenza Artificiale (I Fantasmi)

I fantasmi non si muovono casualmente, ma sono guidati dall'algoritmo di **Pathfinding A*** e seguono diversi "stati" comportamentali:

1. **🔵 Pattugliamento (Luce Azzurra):** I fantasmi vagano casualmente per il labirinto.
2. **🟡 Indagine (Luce Gialla):** Se avvertono un rumore o un'anomalia, cambiano espressione e si dirigono verso l'origine del suono per investigare.
3. **🔴 Caccia (Luce Rossa):** Quando vieni individuato nel loro cono visivo, il loro volto si fa aggressivo e inizieranno a inseguirti aumentando la velocità, cambiando dinamicamente il tema musicale della partita.
4. **🌀 Stordimento (Colore Blu / Volto Frastornato):** Se spari a un fantasma, questo diventerà inoffensivo e scapperà velocemente verso il centro del labirinto per rigenerarsi, per poi tornare in pattugliamento.

### 🔫 Armi e Combattimento

Per difenderti, avrai a disposizione un arsenale:

- **Pistola Base:** Hai munizioni infinite, ma un rateo di fuoco lento. Spara solo se strettamente necessario, poiché il baccano può svelare la tua posizione a tutta la mappa.
- **Armi Speciali (Fucile d'Assalto):** Generati proceduralmente all'interno dei vicoli ciechi della mappa. Offrono fuoco automatico, ottimo per sfuggire ad agguati multipli, ma hanno solo un caricatore da 30 colpi. Una volta esauriti, tornerai alla pistola.

### 📊 End-Game e Tabellone

Al termine della partita, l'interfaccia HTML mostrerà un riepilogo dettagliato delle tue statistiche (monete raccolte, volte in cui sei stato scoperto, precisione di tiro, ecc.).
*Nota VR: In caso di fine partita con il visore, la sessione VR verrà terminata automaticamente per permettere all'utente di consultare il menu sul monitor e riavviare istantaneamente una nuova mappa senza dover ricaricare la pagina web.*

---

## 🛠️ Stack Tecnologico e Dettagli

- **Grafica Low-Poly Cel-Shaded:** Stile pulito, senza luci dinamiche native per garantire performance ottimali (90+ fps stabili in VR).
- **Custom Shaders & Dynamic LOD:** L'illuminazione ambientale, le torce delle armi e la luce emessa dai fantasmi sono calcolate tramite uno **ShaderMaterial** personalizzato. Il gioco elabora la distanza delle entità per passare allo shader in tempo reale solo le luci dei 4 fantasmi più vicini al giocatore, garantendo scalabilità anche in mappe popolate da decine di nemici.
- **Mappe Procedurali:** I labirinti vengono generati casualmente ad ogni avvio tramite l'algoritmo *Recursive Backtracking*, modificato appositamente per rimuovere i vicoli ciechi e introdurre dei "loop" ciclici in pieno stile Pac-Man.

---

## 🚀 Roadmap e Sviluppi Futuri

Tra le caratteristiche considerate o programmate per i prossimi aggiornamenti troviamo:

- [ ] **UI/UX:** Integrazione di interfacce diegetiche, come una mini-mappa o indicatori delle munizioni integrati su un display ancorato al polso del giocatore (smartwatch/device 3D) o HUD a schermo fluttuante.
- [ ] **Grafica:** Sostituzione delle monete con vari tipi di caramelle.
- [ ] **Audio:** Sostituzione delle musiche e degli effetti sonori.
- [ ] **Gamplay:** Introduzione di nuove tipologie di nemici o power-up.
- [ ] **Mobile/Tablet:** Integrazione comandi a schermo per dispositivi touch.

---

## 🕹️ Controlli

**Per PC (Modalità Flat):**

- Modifica le impostazioni e clicca sul pulsante `Gioca`.
- **W, A, S, D**: Movimento.
- **Mouse**: Visuale / Mira.
- **Tasto Sinistro Mouse**: Spara.

**Per Visori VR:**

- Modifica le impostazioni e clicca sul pulsante `ENTER VR`.
- **Levetta Analogica Sinistra**: Movimento.
- **Levetta Analogica Destra**: Rotazione della visuale.
- **Grilletto Destro**: Spara.
- **Tasto B**: Esci dalla VR.
