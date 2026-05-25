# Game Design Document: Pacman VR FPS

## 1. Concept e Panoramica

Il gioco è uno sparatutto in prima persona (FPS) a tema dark-horror basato su Pacman. È sviluppato in VR utilizzando WebXR e Three.js, ma mantiene la retrocompatibilità con i controlli "flat" tradizionali (tramite WASD e mouse).

## 2. Obiettivi e Condizioni di Gioco

* **Inizio Partita:** Il livello si avvia nel momento in cui il giocatore raccoglie la pistola che fluttua davanti a lui.

* **Condizione di Vittoria:** Per superare il livello, il giocatore deve esplorare la mappa e raccogliere tutte le monete.

* **Condizione di Sconfitta (Game Over):** Il giocatore perde istantaneamente la partita se viene toccato da uno dei quattro fantasmi.

## 3. Level Design e Generazione

* **Mappe Procedurali:** I livelli sono di forma quadrata e generati proceduralmente in stile labirinto di Pacman, omettendo però i passaggi "warp" attraverso le pareti esterne.

* **Difficoltà Personalizzabile:** I livelli di difficoltà del gioco sono determinati dalla personalizzazione di diversi parametri, tra cui: dimensione del labirinto, numero delle armi, numero di fantasmi e la velocità di movimento di questi ultimi.

## 4. Arsenale

* **Arma Base (Pistola):** Ha un rateo di fuoco lento ma è dotata di munizioni infinite. È l'arma con cui si inizia e quella a cui si torna quando si esauriscono le munizioni delle armi speciali.

* **Armi Speciali (Fucili Automatici):** Sparsi per il livello sono disponibili quattro fucili automatici. Ciascuno ha a disposizione un solo caricatore; una volta esaurito, l'arma si scarica e si torna a usare la pistola base.

## 5. Meccaniche Sonore e Stealth

Ogni azione nel labirinto produce un livello di rumore che può allertare i nemici:

* **Rumore Basso:** Raccogliere le monete produce un suono udibile dai fantasmi solo nelle immediate vicinanze.

* **Rumore Alto:** Raccogliere un'arma da terra o esplodere dei colpi genera un suono che si propaga ed è udibile in tutto quanto il labirinto.

## 6. Intelligenza Artificiale (I Fantasmi)

I fantasmi, che fungono da nemici, sono esteticamente tutti bianchi e uguali, privi di personalità individuali. Il loro comportamento è governato da quattro stati distinti:

* **Stato Normale (Pattugliamento):** I fantasmi camminano a caso nel labirinto. Proiettano una luce frontale bianca che indica il loro cono di vista (con un FOV di 90°).

* **Stato di Allerta (Indagine):** Quando un fantasma sente un rumore, la sua espressione diventa "curiosa" e la sua luce si colora di giallo. In questa fase, inizia a camminare verso il luogo del rumore sfruttando l'algoritmo di pathfinding A*.

* **Stato di Caccia:** Se il fantasma riesce a vedere il giocatore, assume un'espressione "cattiva", la sua luce diventa rossa e inizia a correre verso l'ultima posizione nota del giocatore.

* **Stato Sconfitto:** Il giocatore può neutralizzare i fantasmi sparandogli. Se colpiti, questi perdono la loro letalità, diventano di colore blu e tornano in modo inoffensivo verso la loro base centrale per ricaricarsi.

## 7. Grafica e Ottimizzazione Tecnica

* **Stile Visivo:** Il gioco usa un'estetica low-poly con effetto cel-shading. Le superfici non hanno texture complesse, ma adottano colori uniformi per massimizzare le prestazioni.

* **Illuminazione:** Per risparmiare risorse e mantenere i framerate alti in VR, non vengono calcolate luci in tempo reale. Invece delle tradizionali ombre dinamiche, il motore sfrutta il *projective texturing*.
