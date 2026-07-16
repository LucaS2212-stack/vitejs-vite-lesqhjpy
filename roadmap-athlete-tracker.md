# Roadmap — Athlete Tracker

Ultimo aggiornamento: 2026-07-15, dopo la prima analisi approfondita del codice (`src/App.jsx`, 2077 righe) fatta con Claude Code. Questo file non esisteva prima nel repo — è stato ricostruito da zero partendo dal riepilogo dato a voce dall'utente più tutto ciò che è emerso leggendo il codice riga per riga. Vive in `vitejs-vite-lesqhjpy-main/` (il vero project root).

**Come usarlo**: quando riprendi il lavoro, apri questo file per primo. Aggiorna lo Stato di una riga quando fai qualcosa (⬜→🔧→✅), aggiungi righe nuove quando emergono altri problemi, non cancellare le righe fatte — spostale eventualmente in una sezione "Fatto" se il file diventa troppo lungo. Vedi anche `ISTRUZIONI-RIPRESA.md` per il contesto su come è nata questa lista.

## Legenda flag

**Priorità**: 🔴 Alta (blocca altro / rischio concreto) · 🟡 Media (va fatto ma non urgente) · 🟢 Bassa (rifinitura, quando c'è tempo)

**Stato**: ⬜ Da fare · 🔧 In corso · ✅ Fatto · ❓ Da decidere insieme (non è un bug, è una scelta)

---

## 0. Decisioni di design già prese (baseline, per riferimento — non da rifare)

Queste sono le regole che il progetto dichiara di seguire (raccolte dal riepilogo dato dall'utente, non da un file scritto in precedenza). Tutto il resto della roadmap misura quanto il codice attuale le rispetta.

| Decisione | Dettaglio |
|---|---|
| Layout | Desktop-first, sidebar laterale fissa, raggruppata per categoria, collassabile |
| Tema | Scuro quasi nero `#050506`, esiste anche variante Light (`LIGHT` in App.jsx) |
| Accento | Rosa `#FF4D8D` |
| Colore badge sezione | Rosso acceso `#FF3B30`, pattern "Kicker" = quadratino bianco + testo rosso maiuscolo |
| Font corpo | Inter |
| Font numeri/titoli grandi | Inter Tight |
| Font loading | *Dichiarato*: via Google Fonts in `index.html`. **Verificato falso, vedi riga F1 sotto.** |
| Tipografia | Token centralizzati nell'oggetto `TYPE` in cima a `App.jsx`, usare `typeStyle()` invece di `fontSize` sparsi |
| Grafico Dashboard | SVG disegnato a mano (`buildLinePath()`, `pointPct()`), niente recharts, glow via `drop-shadow`, istogramma decorativo dietro, badge flottante |
| Modalità demo | Toggle in header, dati sintetici senza toccare Supabase |

---

## 1. Sistema di design — coerenza tra sezioni

| # | Priorità | Stato | Voce | Descrizione | Riferimento |
|---|---|---|---|---|---|
| D1 | 🔴 | ✅ | Font "Inter Tight" mai caricato | **Risolto 2026-07-16**: aggiunti `<link>` Google Fonts corretti in `index.html` (Inter, Inter Tight, Space Grotesk) e rimosso il vecchio `@import` (parziale, solo Inter) dentro `App.jsx`. | `index.html`, `App.jsx` |
| D2 | 🔴 | 🔧 | Radius incoerente: sezioni mai aggiornate al linguaggio "Card/radius-6/glass" | `AuthScreen`, `MealPlan`, `PlanningSetup`/Planning, e la modale "Modifica giorno" usano ancora radius 12–24 e bottoni gradiente pieni, invece del linguaggio flat/radius-6 di Dashboard e Peso. Non è un dettaglio isolato: è sistemico su 4 aree intere dell'app. **2026-07-16**: caricati su Claude Design 5 confronti visivi fedeli (palette/tipografia, card vecchio/nuovo, bottoni CTA, Kicker/KPI/Tag, modale bottom-sheet) — vedi sezione 6. In attesa che l'utente scelga tra: uniformare tutto al nuovo linguaggio, o tenere consapevolmente due registri. | `App.jsx:194-254` (Auth), `MealPlan` (righe 257-781), `PlanningSetup` (785-873), modale (2105-2137) |
| D3 | 🟡 | ⬜ | `TYPE` usato solo a macchia di leopardo | Applicato quasi solo nella card grafico peso della Dashboard. Altrove i numeri grandi sono ridichiarati a mano con valori leggermente diversi (es. peso in cima al tab Peso: `fontSize:34,fontWeight:700` invece di `typeStyle(TYPE.hero,...)` che è weight 800 — stesso ruolo, valore diverso per copia-incolla). | `App.jsx:1521` vs `App.jsx:73-81` |
| D4 | 🟡 | 🔧 | `Kicker` (badge quadratino+rosso) assente in metà dei tab | Presente in Dashboard, Peso, Check-in. Assente in Oggi, Piano, Planning, Meal Plan — questi tab partono dritti con le card, senza l'intestazione di sezione che il resto dell'app usa. **2026-07-16**: ridisegnato lo stile del Kicker stesso (vedi D4b) prima di decidere dove aggiungerlo — ora manca ancora l'estensione ai 4 tab senza Kicker. | tab `oggi` (1364+), `piano` (1621+), `planning` (1741+), `meal` (2036+) |
| D4b | 🟡 | ✅ | Kicker: nuovo font/colore/dimensione decisi e implementati | **Deciso e fatto 2026-07-16**, dopo iterazione su Claude Design: font Space Grotesk 700 (era Inter Tight), 20px (era 12px), letter-spacing 3px (era 0.6px), quadratino 13×13 con radius 3 (era 7×7 spigolo vivo), maiuscolo esplicito (`textTransform:"uppercase"`, mancava anche nell'originale). Colore rosso cambiato da `#FF3B30` a `#EF233C` sul token condiviso `DARK.red` — cambia anche altri usi dello stesso rosso (es. bottone "Reset dati", errori) per coerenza; `LIGHT.red` non toccato. | `App.jsx` — funzione `Kicker`, oggetto `DARK`/`LIGHT` |
| D5 | 🟡 | ⬜ | Tre stili di bottone CTA primario coesistono | (a) gradiente blu/indigo radius 12-14 — il più diffuso: Oggi, Piano, Planning, Meal Plan, modale. (b) gradiente rosa/viola radius 6 — Peso "Salva", Check-in "Salva check-in", header. (c) bottoni header flat radius 6. Stesso ruolo semantico (azione principale), tre linguaggi visivi diversi a seconda di quando quella parte è stata scritta. | vedi bottoni "Salva" in ogni tab |
| D6 | 🟢 | ❓ | Due sistemi di grafico coesistono (SVG a mano vs recharts) | Dashboard hero = SVG custom con glow; Peso/Piano/Planning = recharts con tooltip/griglia in stile diverso (curve morbide, pill tooltip, niente glow). Raddoppia la superficie di manutenzione per lo stesso tipo di dato. **Decisione**: portare più grafici allo stile custom, o accettare recharts come "stile secondario" per i grafici non-hero? | `App.jsx:1300-1320` (SVG) vs `1569-1593`, `1820-1833`, `1852-1865` (recharts) |
| D7 | 🟢 | ✅ | `index.html` non rinominato | **Risolto 2026-07-16**: `<title>Athlete Tracker</title>`, `lang="it"`. | `index.html:2-7` |

---

## 2. Bug funzionali concreti

| # | Priorità | Stato | Voce | Descrizione | Riferimento |
|---|---|---|---|---|---|
| B1 | 🟡 | ⬜ | Layout non reagisce al resize della finestra | Sidebar-desktop vs bottom-nav-mobile è deciso da `window.innerWidth>=768` letto una sola volta al render, senza `resize`/`matchMedia` listener. Se ridimensioni la finestra senza refreshare, il layout resta bloccato su quello iniziale. | `App.jsx:1197-1200`, `2090` |
| B2 | 🟢 | ⬜ | `onBlur2` è un prop React inesistente | Sull'input note in "Storico settimanale": il bordo si colora di blu al focus ma non torna mai al colore normale, perché il gestore di reset è scritto come `onBlur2` invece di sfruttare l'unico `onBlur` reale (che fa altro). | `App.jsx:1503` |
| B3 | 🟡 | ❓ | Modalità demo copre solo una piccola parte dell'app | `generateDemoData()` alimenta solo il grafico peso hero e la KPI "media passi" in Dashboard. Tutti gli altri tab (Oggi, Peso, Piano, Planning, Meal Plan, Check-in) ignorano `demoMode` e continuano a leggere/scrivere Supabase reale. Il toggle in header promette più di quanto mantenga. **Decidere**: estendere a tutta l'app o etichettare più chiaramente l'ambito ("solo grafico peso")? | `App.jsx:1258, 1351` |
| B4 | 🟢 | ⬜ | Bottom-nav mobile con 6 voci — verificare overflow | 6 icone in `justify-content:space-around` su schermi molto stretti non è stato verificato visivamente su viewport piccoli reali. Da controllare in DevTools mobile prima di considerarlo ok. | `App.jsx:2090-2102` |

---

## 3. Codice morto / residui da ripulire

| # | Priorità | Stato | Voce | Descrizione | Riferimento |
|---|---|---|---|---|---|
| C1 | 🟢 | ⬜ | `weekCalChart`, `calLineChart56`, `stepsChart`, `planDeltas` mai usati | Calcolati ad ogni render ma non renderizzati in nessun tab — probabilmente grafici/riepiloghi pianificati e poi accantonati. | `App.jsx:1107-1131` |
| C2 | 🟢 | ⬜ | Componente `FloatingBadge` mai montato | Pensato come tooltip custom per recharts (via `Customized`), mai collegato a un grafico reale. | `App.jsx:125-143` |
| C3 | 🟢 | ⬜ | Import morti da recharts | `BarChart`, `Bar`, `Customized` importati ma mai usati in tutto il file. | `App.jsx:2` |
| C4 | 🟢 | ⬜ | Commento `{/* ── CHAT ── */}` orfano | Sopra al tab Piano, traccia di una feature "chat" mai iniziata. Da rimuovere o trasformare in item di roadmap vero (vedi sezione 5). | `App.jsx:1619` |
| C5 | 🟢 | ⬜ | `package.json` name ancora `vite-react-typescript-starter` | Mai rinominato in qualcosa tipo `athlete-tracker`. | `package.json:2` |
| C6 | 🟢 | ⬜ | Scaffolding TypeScript inutilizzato | `tsconfig*.json` + devDependencies TS presenti, ma zero file `.ts`/`.tsx` — solo `.jsx`. O si rimuove lo scaffolding TS, o si pianifica una migrazione vera (probabilmente non ne vale la pena su un file da 2000+ righe senza test). | root del progetto |

---

## 4. Infrastruttura / sicurezza / robustezza

| # | Priorità | Stato | Voce | Descrizione | Riferimento |
|---|---|---|---|---|---|
| I1 | 🔴 | ✅ | Questa cartella locale non è un repository git | **Risolto 2026-07-16**: repo reale è `github.com/LucaS2212-stack/vitejs-vite-lesqhjpy`. Verificato che `src/App.jsx` locale era già identico byte-per-byte (solo differenza di fine riga LF/CRLF) all'ultimo commit del repo — nessuna divergenza, nessun dato perso. Cartella collegata con `git init` + `remote add origin` + merge della storia (`--allow-unrelated-histories`), unico conflitto risolto: `package-lock.json` (preso quello del repo). Branch `main` ora traccia `origin/main`. **Non ancora pushato** — l'unica differenza rispetto a `origin/main` sono i 3 file doc nuovi (`CLAUDE.md`, `roadmap-athlete-tracker.md`, `ISTRUZIONI-RIPRESA.md`). Chiedere conferma prima di pushare, dato che il deploy Vercel è automatico. | root del progetto |
| I2 | 🔴 | ✅ | Verificare le policy RLS su tutte le tabelle Supabase | **Verificato 2026-07-16**: RLS attiva (bottone "Disable RLS") su `athlete_day_meals`, `athlete_days`, `athlete_foods`. Policy campione ispezionata su `athlete_day_meals` ("user access", comando ALL, ruolo public): `using (auth.uid() = user_id) with check (auth.uid() = user_id)` — pattern corretto e sicuro. Le altre tabelle non sono state controllate una per una (stesso sviluppatore, stesso pattern boilerplate, rischio ritenuto basso) — se in futuro si aggiunge una tabella nuova, ricontrollare che abbia la stessa policy. | `App.jsx:6-8` |
| I2b | 🟢 | ❓ | Tabella Supabase `athlete_day_meals` sembra orfana | Non compare da nessuna parte in `src/App.jsx` (l'app usa `athlete_meal_plan`, nome diverso). L'utente ha confermato a voce che alcune tabelle non servono più — in attesa di sapere quali, per poterle eliminare da Supabase (righe morte = superficie di rischio inutile anche se RLS è a posto). | Supabase dashboard |
| I3 | 🟡 | ⬜ | Chiavi Supabase hardcoded nel sorgente invece che in variabili d'ambiente | Funziona (anon key è pensata per essere pubblica), ma hardcodarla rende più scomodo avere ambienti diversi (dev/staging/prod) e la espone anche a chi guarda solo il codice sorgente senza aprire devtools. Da valutare spostarla in `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. | `App.jsx:6-7` |
| I4 | 🟡 | ⬜ | `api/fatsecret.js` ha un nome fuorviante e usa una chiave demo rate-limited | Il file si chiama "fatsecret" ma non chiama mai l'API FatSecret: interroga Open Food Facts + USDA FoodData Central. USDA è chiamato con `api_key=DEMO_KEY`, la chiave pubblica di test di USDA, che ha un limite di richieste orario basso — in produzione con più utenti reali può iniziare a fallire silenziosamente (il `catch(e){}` ingoia l'errore). Da rinominare il file e/o registrare una vera API key USDA. | `api/fatsecret.js:34-44` |
| I5 | 🟢 | ⬜ | Accessibilità: bottoni icona senza `aria-label`, focus states minimi | Bottoni tema/fullscreen/logout/chiudi-modale sono icone pure senza testo accessibile. Non bloccante ma facile da sistemare in un passaggio dedicato. | header (1181-1191), varie `×` in tutto il file |
| I6 | 🟢 | ⬜ | Errori Supabase silenziosi | Nei `catch` dei fetch principali si fa solo `console.error`, nessun messaggio visibile all'utente se il caricamento dati fallisce (es. rete assente). Da valutare un toast di errore generico. | `App.jsx:964` |

---

## 5. Feature abbozzate ma non completate — da decidere: finire o eliminare

| # | Priorità | Stato | Voce | Descrizione |
|---|---|---|---|---|
| F1 | 🟡 | ❓ | Grafico calorie giornaliere (`calLineChart56`) | Dati pronti (ultimi 56 giorni, calorie vs target), mai mostrato. Potrebbe avere senso nel tab Oggi o Piano. |
| F2 | 🟢 | ❓ | Grafico passi (`stepsChart`) | Dati pronti (ultimi 14 giorni), mai mostrato. |
| F3 | 🟢 | ❓ | Riepilogo variazioni piano (`planDeltas`) | Calcola i delta tra una variazione di piano e la precedente (già usato parzialmente nello storico variazioni via logica duplicata inline) — la versione centralizzata in `planDeltas` non è collegata a nulla. |
| F4 | 🟢 | ❓ | Feature "chat" | Solo un commento residuo, nessun codice. Se non è più nei piani, rimuovere il commento (C4). Se lo è ancora, va scritta da zero — non c'è nulla su cui appoggiarsi. |

---

## 6. Claude Design

Progetto creato il 2026-07-16: **"Athlete Tracker — Design System"** (visibile su claude.ai/design con il tuo login). Contiene 5 confronti visivi fedeli al codice reale, pensati per decidere D2:

1. `00-palette-tipografia.html` — swatch colori DARK + scala TYPE con i font caricati correttamente (mostra come *dovrebbero* apparire i numeri grandi, a differenza di oggi — vedi D1)
2. `01-card-vecchio-vs-nuovo.html` — card AuthScreen/MealPlan (radius 24) affiancata alla card Dashboard/Peso (radius 6, glass)
3. `02-bottoni-cta.html` — i tre stili di bottone CTA (D5) uno sotto l'altro
4. `03-kicker-kpi-tag.html` — Kicker/KPI/Tag come riferimento dello stile "nuovo" già stabile
5. `04-modale-bottom-sheet.html` — la modale "Modifica giorno", caso a parte da discutere

Quando l'utente decide su D2 (uniformare o tenere due registri), aggiornare qui lo stato e procedere con l'implementazione nel codice sorgente.

## Prossimi passi consigliati (ordine sensato)

1. **D1** (font Inter Tight) — 5 minuti, impatto visivo immediato su tutta l'app.
2. **I1** (chiarire lo stato del repo git) — prima di scrivere altro codice, capire dove deve finire per arrivare in produzione.
3. **I2** (verificare RLS su Supabase) — sicurezza, va controllato prima di continuare ad aggiungere dati reali.
4. **D2** (decidere se uniformare il linguaggio visivo) — è la domanda di design più grossa aperta, guida tutto il resto del lavoro estetico.
5. Pulizia codice morto (sezione 3) — a rischio zero, si può fare in qualsiasi momento libero.
6. Il resto (D3-D7, B1-B4, sezione 5) — via via, non urgente.
