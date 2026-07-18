# Roadmap — Athlete Tracker

Creato 2026-07-15 dopo la prima analisi approfondita del codice (`src/App.jsx`, 2077 righe) fatta con Claude Code. Aggiornato 2026-07-16 con: collegamento del repo git reale, decisione+implementazione del nuovo Kicker, inventario funzionalità, e analisi di riorganizzazione delle sezioni esistenti (sezione 8). Questo file non esisteva prima del 2026-07-15 nel repo — è stato ricostruito da zero partendo dal riepilogo dato a voce dall'utente più tutto ciò che è emerso leggendo il codice riga per riga. Vive in `vitejs-vite-lesqhjpy-main/` (il vero project root).

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
| D4b | 🟡 | ✅ | Kicker: nuovo font/colore/dimensione decisi e implementati | **Deciso e fatto 2026-07-16**, dopo iterazione su Claude Design: font Space Grotesk 700 (era Inter Tight), **24px finale** (passato da 12→20→24px in tre round di feedback), letter-spacing 3px (era 0.6px), quadratino **15×15 con radius 3** (era 7×7 spigolo vivo), maiuscolo esplicito (`textTransform:"uppercase"`, mancava anche nell'originale). Colore rosso cambiato da `#FF3B30` a `#EF233C` sul token condiviso `DARK.red` — cambia anche altri usi dello stesso rosso (es. bottone "Reset dati", errori) per coerenza; `LIGHT.red` non toccato. Il Kicker è ora usato anche in Dashboard per una nuova sotto-sezione "Piano" (vedi D8) — stessa dimensione ovunque, nessuna gerarchia di taglia tra Kicker diversi nella stessa pagina. | `App.jsx` — funzione `Kicker`, oggetto `DARK`/`LIGHT` |
| D8 | 🟡 | ✅ | Dashboard: card "giorno ON/OFF/media passi/ultimo check-in" ristilizzate | **Fatto 2026-07-16** dopo iterazione su Claude Design (partita da un'idea di riquadro accanto al grafico, poi scartata su richiesta dell'utente — vedi note in conversazione). Cambiamenti reali: "ANDAMENTO PESO" ora maiuscolo/bianco/più grande, più spazio tra il numero e il grafico; aggiunto un secondo Kicker "PIANO" (stessa dimensione di "DASHBOARD", non ridotto) sopra la griglia; card ridotte da 4 a **3** (rimossa "ultimo check-in"), "media passi" rinominata **"Passi settimanali"**; stile monocromo — via i 4 bordi colorati (rosa/blu/arancio/verde) e le icone, resta solo un bordo uniforme sottile come il resto delle `Card`. | `App.jsx` — tab `dashboard` |
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
| B5 | 🔴 | ⬜ | Bottone "Reset dati" non fa nulla | `onClick={()=>{if(window.confirm("Cancellare tutti i dati?")){}}}` — il blocco `if` è vuoto. Popup di conferma, poi zero azione. | `App.jsx:1684` (tab Piano) |
| B8 | 🟢 | ⬜ | Warning console ricorrente su `border`/`borderLeft` misti | React segnala ripetutamente in console "Updating a style property during rerender (border) when a conflicting property is set (borderLeft)" — succede in un punto del codice (probabilmente Planning, non ancora individuato con precisione) dove uno stesso elemento riceve sia `border` che `borderLeft` nello stesso oggetto style. Non blocca nulla ma va isolato e sistemato come fatto oggi nel Check-in giornaliero (bordi separati per lato invece dello shorthand). | da individuare — appare a runtime, non ancora isolato nel sorgente |
| B6 | 🔴 | ✅ | Note di "Storico settimanale" (tab Oggi) non vengono mai salvate | **Risolto 2026-07-16, per rimozione**: l'utente ha chiesto di togliere del tutto la sezione "questa settimana"/"storico settimanale" dal Check-in giornaliero (ora è solo giornaliero, lo storico non c'entra più). `weekNotes` e il grafico a barre settimanale sono stati rimossi insieme al bug, non serviva più correggerlo. | rimosso da `App.jsx` |
| B7 | 🟡 | ✅ | Bottone "Salva" nel tab Oggi è un placebo | **Risolto 2026-07-16, per rimozione**: la card "Inserimento" col bottone finto è stata sostituita dal nuovo design del Check-in giornaliero (card calorie/macro + Passi/Peso), che non ha nessun bottone "Salva" — tutti i campi salvano solo via `onBlur`, coerente e senza falsi segnali. | rimosso da `App.jsx` |

### Collegamenti mancanti tra sezioni (i più importanti da capire prima di riorganizzare)

| # | Priorità | Stato | Voce | Descrizione | Riferimento |
|---|---|---|---|---|---|
| X1 | 🔴 | ❓ | Planning non aggiorna mai il Piano attivo | Il tab **Planning** calcola una progressione di calorie/macro settimana per settimana (es. per un cut di 8 settimane, le calorie scendono gradualmente). Ma questi valori vivono *solo* dentro `athlete_planning` e alimentano *solo* i grafici del tab Planning stesso. Il tab **Oggi** invece applica ogni giorno i target da `plan` (tab Piano) — che resta fisso finché non lo modifichi *a mano* in Piano. Risultato: se imposti un cut strutturato in Planning, l'app non applica mai automaticamente la riduzione calorica pianificata al tracking giornaliero reale — sono due sistemi paralleli che non si parlano. Verificato: nessuna chiamata a `setPlan` esiste nel codice di Planning. | Planning (`App.jsx:1746-2032`) vs `plan`/Piano (`App.jsx:1621-1738`) |
| X2 | 🔴 | ❓ | Meal Plan non alimenta il log giornaliero di Oggi | Nel tab **Meal Plan** costruisci pasti dettagliati con alimenti reali, quantità, macro calcolate automaticamente. Ma nel tab **Oggi** il log giornaliero è inserimento manuale di 4 numeri (calorie/proteine/carbo/grassi) — non ha alcun riferimento a cosa hai effettivamente pianificato o mangiato secondo il Meal Plan. Esiste uno stato `dayMeals` dichiarato (`useState({})`) che sembra un tentativo di collegare "pasti del giorno" al log giornaliero — ma non è mai letto né scritto da nessuna parte del codice: è stato iniziato e abbandonato. | `App.jsx:914` (dichiarazione mai usata) |

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

## 7. Funzionalità — inventario, miglioramenti, proposte

Richiesto dall'utente il 2026-07-16: organizzare cosa c'è, cosa va migliorato, cosa manca, più idee proposte da Claude.

### 7.1 Cosa c'è oggi (per area)

| Area | Cosa fa | Dove |
|---|---|---|
| Autenticazione | Login/registrazione/logout via Supabase, opzione "rimani connesso" | `AuthScreen` |
| Dashboard | Grafico peso hero (SVG custom, periodi 1M/3M/6M/1A/Tutto), card riepilogo ON/OFF (calorie+macro target), media passi settimana, ultimo check-in | tab Dashboard |
| Log giornaliero | Calorie/proteine/carbo/grassi/passi/cardio/note, eccezione ON/OFF per il singolo giorno, bar chart settimana corrente (cliccabile → modale), storico settimanale con note libere | tab Oggi |
| Pesata | Inserimento peso+nota, medie e delta vs giorno/settimana precedente, grafico giornaliero + media settimanale, storico con eliminazione | tab Peso |
| Piano nutrizionale base | Pattern settimanale ON/OFF (7 giorni), editor calorie/macro per ON e OFF, storico variazioni con delta calcolati | tab Piano |
| Planning strutturato | Piani multi-settimana (cut/bulk/recomp/mantenimento), progressione automatica calorie/peso target settimana per settimana, grafici pianificato-vs-reale, editing per settimana con propagazione "applica alle prossime N" | tab Planning |
| Meal plan | Pasti separati ON/OFF, ricerca alimenti (Open Food Facts + USDA), alimenti preferiti ("i miei") e recenti, aggiunta manuale, scanner barcode via fotocamera, calcolo automatico quantità→macro, totali per pasto e per giornata, autosave | tab Meal Plan |
| Check-in settimanale | Target sessioni/minuti cardio, minuti cardio effettivi (aggregati automaticamente dal log giornaliero), note libere | tab Check-in |
| Modalità demo | Dati sintetici, ma solo per grafico peso Dashboard + media passi (vedi B3) | header |
| Globale | Tema chiaro/scuro persistente, sidebar desktop collassabile, nav mobile a barra, fullscreen | tutta l'app |

### 7.2 Da migliorare (funzionalità esistenti con lacune concrete)

| # | Priorità | Stato | Voce | Descrizione | Riferimento |
|---|---|---|---|---|---|
| B5 | 🔴 | ⬜ | Bottone "Reset dati" non fa nulla | `onClick={()=>{if(window.confirm("Cancellare tutti i dati?")){}}}` — il blocco `if` è vuoto. L'utente vede il popup di conferma, clicca "ok", e non succede assolutamente niente. O si implementa davvero, o si toglie il bottone (così com'è ora è ingannevole). | `App.jsx:1684` (tab Piano) |
| — | — | — | Modalità demo parziale | Vedi B3 in sezione 2 — copre solo grafico peso + media passi. | — |
| — | — | — | Grafici pronti ma mai mostrati | Vedi F1-F3 in sezione 5 — calorie giornaliere, passi, riepilogo variazioni piano: dati già calcolati, solo da agganciare a un tab. | — |
| — | — | — | Ricerca alimenti con chiave USDA a consumo limitato | Vedi I4 — rischio di iniziare a fallire silenziosamente con più utenti reali. | — |
| — | — | — | Nessun feedback visibile su errori di rete | Vedi I6 — se Supabase non risponde, l'utente non vede nulla, solo `console.error`. | — |

### 7.3 Proposte di Claude — funzionalità nuove da valutare

Ordinate per quanto sembrano centrali rispetto all'identità dell'app (tracker da bodybuilder), non per facilità implementativa.

| # | Impatto | Proposta | Perché | Effort stimato |
|---|---|---|---|---|
| P1 | 🔴 Alto | **Log allenamento pesi** (esercizi, serie, ripetizioni, carico) | È la lacuna più grande: l'app si chiama "Athlete Tracker" ed è pensata per bodybuilder, ma oggi traccia solo cardio in minuti — zero tracking dell'allenamento coi pesi, che per un bodybuilder è il dato più importante di tutti (progressive overload). Potrebbe agganciarsi al giorno ON/OFF come il resto. | Alto — nuova tabella Supabase, nuovo tab, UI per serie/ripetizioni |
| P2 | 🟡 Medio-alto | **Misure corporee** (vita, petto, braccia, cosce…) oltre al solo peso | Il peso da solo non racconta ricomposizione corporea (si può perdere grasso e guadagnare muscolo a peso costante) — le circonferenze sono lo standard per chi fa cut/bulk seri. | Medio — riusa pattern già esistente per il peso (stessa UI, altra tabella) |
| P3 | 🟡 Medio-alto | **Foto progressi** (galleria cronologica) | Confronto visivo nel tempo, standard in ogni app fitness seria, completa bene misure+peso. | Medio — serve storage immagini (Supabase Storage) |
| P4 | 🟡 Medio | **Pasti/ricette riutilizzabili** ("il mio solito pranzo") | Oggi si salvano solo alimenti singoli preferiti; ricomporre lo stesso pasto di più alimenti va rifatto ogni volta. Un template pasto risparmierebbe molti click quotidiani. | Basso-medio — estende `athlete_foods`/meal plan esistente |
| P5 | 🟢 Medio | **Import automatico passi** (Google Fit / Apple Health / Fitbit) | Oggi i passi si inseriscono a mano; con più utenti l'attrito quotidiano scoraggia l'uso costante. | Alto — richiede integrazioni OAuth con servizi esterni |
| P6 | 🟢 Medio | **Esportazione dati** (CSV/PDF) | Utile per backup personale o per condividere l'andamento con un coach/nutrizionista esterno all'app. | Basso-medio |
| P7 | 🟢 Medio | **Statistiche avanzate** (proiezione trend peso, correlazione aderenza calorica↔variazione peso) | Con mesi di dati storici già raccolti (peso, calorie, planning), c'è materiale per analisi più utili dei semplici totali attuali. | Medio |
| P8 | 🟢 Basso-medio | **Notifiche/promemoria** (pesarsi, loggare pasti) | Aiuta l'aderenza quotidiana, ma richiede la app installabile (vedi P10) per le notifiche push sul telefono. | Medio (dipende da P10) |
| P9 | 🟢 Basso | **Tracker idratazione** | Coerente con lo stile del tab Oggi, semplice da aggiungere se serve davvero. | Basso |
| P10 | 🟢 Basso-medio | **PWA installabile** (manifest.json + service worker) | L'app ha già un layout mobile dedicato (bottom-nav) — renderla installabile la farebbe sembrare un'app nativa sul telefono, ed è prerequisito per notifiche push (P8). | Medio |

## 8. Riorganizzazione delle sezioni esistenti

Richiesto dall'utente il 2026-07-16, dopo aver deciso di non aggiungere per ora nuove funzionalità (niente log allenamento, misure corporee rimandate) e concentrarsi su ordinare meglio quello che c'è. I due collegamenti mancanti (X1, X2 sopra) sono il problema di fondo da cui dipende buona parte di questa sezione — vale la pena deciderli prima di riorganizzare visivamente, altrimenti si riordinano scaffali che puntano nel vuoto.

### Dashboard
**Struttura attuale**: Kicker + grafico peso hero, poi 4 card piatte (kcal ON, kcal OFF, media passi, ultimo check-in).
**Punti deboli**:
- È quasi solo "peso-centrica" — l'unica vista ricca è il grafico peso. Zero visibilità su come sta andando l'aderenza calorica/macro di oggi o della settimana, che per un bodybuilder in cut/bulk è altrettanto (se non più) rilevante del peso da solo.
- Non mostra affatto il cardio, pur essendo tracciato ogni giorno.
- Non mostra in che fase del piano ci si trova (Planning ha "settimana 4 di 8" ma non è visibile da Dashboard, che dovrebbe essere la vista d'insieme per definizione).
- La card "ultimo check-in" mostra solo una nota troncata — poco utile come riepilogo a colpo d'occhio.

**Come riorganizzare**: aggiungere sopra o accanto al grafico peso una riga di stato rapido: aderenza calorica di oggi/settimana (%), fase piano attuale se Planning è in uso ("Cut · Sett. 4/8"), cardio della settimana vs target. La card "ultimo check-in" andrebbe sostituita con qualcosa di più azionabile (es. countdown al prossimo check-in, o il target cardio con barra di progresso invece della nota).

### Oggi
**Struttura attuale**: 3 card in sequenza senza intestazioni — progresso di oggi (barre), form di inserimento, poi bar chart settimana + storico settimanale con note.
**Punti deboli**:
- Nessuna separazione visiva chiara tra "oggi" e "storico delle settimane passate" — sono nella stessa colonna di card senza un `Kicker` che segnali il cambio di argomento (coerente con D4).
- Il bottone "Salva" è un placebo (B7) — dà un falso senso di "adesso ho salvato", quando in realtà ogni campo si salva già da solo. Meglio toglierlo o farlo diventare un vero riepilogo/conferma.
- Le note di "Storico settimanale" si perdono al refresh (B6) — è probabilmente il bug più subdolo di tutta l'app: sembra funzionare (l'input accetta testo, non dà errori) ma non salva niente.
- Il cardio inserito qui confluisce nel tab Check-in ma non c'è alcun rimando visivo tra le due sezioni — un utente nuovo non lo scoprirebbe mai leggendo solo l'interfaccia.

**Come riorganizzare**: dividere chiaramente in due blocchi con Kicker propri — "oggi" (progresso + inserimento, che potrebbero anche fondersi in una sola card invece di due) e "storico" (bar chart settimana + lista settimane). Sistemare B6/B7 prima di qualunque riordino estetico, altrimenti si abbelisce un form che perde dati.

### Peso
**Struttura attuale**: 2 card valore + KPI row + form nuova pesata + grafico + storico.
**Punti deboli**: è la sezione meglio organizzata dell'app — poco da dire. Unico neo: manca un Kicker in cima (D4), per coerenza con Dashboard/Check-in che invece ce l'hanno.
**Come riorganizzare**: aggiungere il Kicker, per il resto lasciare la struttura com'è — è un buon modello da replicare altrove.

### Piano
**Struttura attuale**: Seg (Piano attuale / Storico variazioni) → pattern settimanale ON/OFF, editor macro ON/OFF, bottone salva, card "piano corrente", bottone reset (rotto).
**Punti deboli**:
- Sovrapposizione concettuale con Planning: entrambi rispondono alla domanda "quali sono i miei target calorici", ma con granularità diverse (fisso vs progressivo) e — come detto in X1 — senza alcun collegamento reale.
- Bottone "Reset dati" rotto (B5).
- La card "Piano corrente" (quando `weeksOn>=1`) ripete in sostanza gli stessi numeri già visibili aprendo "Storico variazioni" → riga più recente — leggera ridondanza, non grave.

**Come riorganizzare**: prima decidere X1 (vedi sopra) — la riorganizzazione visiva di questa sezione dipende da quella scelta. Se si decide di *non* collegare Piano e Planning, andrebbe almeno chiarito nell'interfaccia che sono due strumenti diversi con scopi diversi (es. un sottotitolo tipo "target fissi che usi ogni giorno" vs "simulazione di progressione a lungo termine" in Planning), per evitare che l'utente pensi stiano già comunicando tra loro.

### Planning
**Struttura attuale**: setup iniziale (tipo piano, date, peso iniziale/target) → vista con header piano, KPI, 2 grafici (calorie pianificate, peso pianificato vs reale), tabella settimane editabile.
**Punti deboli**: è la sezione più ricca e visivamente più curata di tutte, ma — per via di X1 — oggi funziona più come un "simulatore" isolato che come qualcosa che guida davvero il tracking quotidiano. È il tab con più lavoro dietro e meno impatto pratico sul resto dell'app, il che è un peccato.
**Come riorganizzare**: la priorità qui non è riordinare la UI (è già ben fatta) ma decidere X1. Se si sceglie di collegarlo, la settimana corrente di Planning dovrebbe scrivere automaticamente su `plan` quando si entra in una nuova settimana (o quantomeno offrire un bottone "applica questa settimana come piano attivo").

### Meal Plan
**Struttura attuale**: Seg Giorno ON/OFF → totale giornata → card per pasto (con ricerca/aggiunta alimenti) → aggiungi pasto → salva meal plan.
**Punti deboli**:
- È un *template* riutilizzabile ("il mio pasto tipo nei giorni ON"), non un log del giorno specifico — cosa ragionevole di per sé, ma il nome "Meal Plan" e la sua vicinanza a "Oggi" nella sidebar suggeriscono all'utente che i due si parlino. Non è così (X2).
- Nessun collegamento, nemmeno "morbido" (es. un bottone "usa questo pasto pianificato per oggi"), tra i pasti costruiti qui e i 4 numeri che si inseriscono a mano in Oggi.
- Visivamente è la sezione più lontana dal linguaggio Dashboard/Peso (radius 12-24 ovunque, coerente con D2 più che con questa sezione specifica).

**Come riorganizzare**: valutare se serve davvero collegare Meal Plan al log di Oggi (X2) — se sì, l'opzione più semplice senza stravolgere tutto è un bottone per-pasto "aggiungi al log di oggi" che sommi le macro di quel pasto ai campi calorie/proteine/carbo/grassi del giorno corrente, invece di ricostruire tutto il flusso di logging.

### Check-in
**Struttura attuale**: KPI row (media passi/calorie/peso) → card cardio (target vs reale) → card note.
**Punti deboli**: sezione compatta e già abbastanza ordinata. Le medie di proteine/carbo/grassi settimanali sono già calcolate altrove (`weeklyStats`) ma non mostrate qui, mentre sarebbe il posto naturale per un riepilogo macro completo della settimana.
**Come riorganizzare**: aggiungere le 3 medie macro mancanti alla KPI row (basta riusare `weeklyStats[7].avgProt/avgCarb/avgFat`, già calcolati, zero lavoro di logica nuova).

## 9. Nuove funzionalità da sheet professionale (2026-07-17)

L'utente ha condiviso screenshot di uno sheet usato da un coach professionista per bodybuilder agonisti. Fatta un'analisi dettagliata fase-per-fase con domande di precisione (vedi anche il piano completo salvato in `C:\Users\luca.sist\.claude\plans\iterative-wishing-quasar.md` per tutti i dettagli e le tabelle Decisione). Riassunto delle 5 aree da costruire, in ordine di dipendenza:

| # | Priorità | Stato | Voce | Descrizione sintetica |
|---|---|---|---|---|
| F1 | 🟡 | ✅ | Pattern settimanale "tipo allenamento" | **Fatto 2026-07-18**, dopo iterazione su Claude Design (concetto giorno-fisso confermato dopo aver mostrato anche l'alternativa a rotazione stile Hevy/Strong). Nel tab Piano: card "Tipi di allenamento" (chip modificabili, colore auto-assegnato da una palette, + aggiungi/rimuovi) e riquadro "Pattern settimanale allenamento" in stile nastro/ribbon (Kicker "PIANO" rosso come Dashboard, accento rosso spesso, nomi per esteso, colori tenui/traslucidi sullo sfondo dei segmenti, click per riassegnare). Persistito in `localStorage` (`atk_training_types`, `atk_training_pattern`), stesso schema di `dayPattern` — non sincronizzato su Supabase, coerente col precedente già esistente per il pattern ON/OFF. | `App.jsx` — tab `piano`, state `trainingTypes`/`trainingPattern` |
| F2 | 🟡 | ✅ | Tipo-allenamento nel Check-in giornaliero | **Fatto 2026-07-18**: badge cliccabile sotto la data, mostra il tipo auto-compilato dal pattern F1, apre una tendina per l'eccezione del singolo giorno (stesso meccanismo del TD/NTD). Richiesta una nuova colonna Supabase `training_type` (text, nullable) su `athlete_days`, aggiunta dall'utente dalla dashboard. | `App.jsx` — tab `oggi`, colonna `athlete_days.training_type` |
| F3 | 🟢 | ⬜ | Meal Plan: campo "momento" per pasto | Tendina libera per pasto (Nessuno/Prima/Durante/Dopo allenamento), mostrata in evidenza nell'intestazione del pasto. Indipendente dal resto, facile da fare in isolamento. |
| F4 | 🟡 | ⬜ | Planning: nuovi tipi Priming e Mini Diet | 2 nuovi tipi piano oltre ai 4 esistenti. Priming = calorie piatte (stesso calcolo di Mantenimento). Mini Diet = cut più aggressivo (percentuale di deficit da fissare in fase di implementazione, valore di partenza proposto 20%). |
| F5 | 🔴 | ⬜ | Planning: storico consultabile (non solo ultimo piano) | Prerequisito tecnico per F6: oggi la query carica solo l'ultimo piano creato (`.limit(1)`), i piani passati sono persi/non recuperabili. |
| F6 | 🟡 | ⬜ | Bottone "Applica questa settimana al Piano" in Planning | Risolve X1 senza sincronizzazione automatica silenziosa: un click copia i valori della settimana Planning corrente dentro `plan`/`athlete_plan_history`. |
| F7 | 🟡 | ⬜ | Nuovo tab "Calendario fasi" | Tab a sé nella sidebar. Tabella settimana→fase→nota: automatica dove c'è uno storico Planning (dipende da F5), manuale nei "buchi" tra un piano e l'altro. Nota libera separata da quelle del Check-in settimanale. |
| F8 | 🟢 | ⬜ | Aggregati mensili nel tab Calendario fasi | Peso + calorie medie + passi medi, mensilizzati (media/differenza/%). Colonna fase con sfondo colorato (come nello sheet) — nessuna banda colorata sui grafici esistenti. Dipende da F7. |

Decisioni esplicite di scope (per non riproporle): niente Sonno, niente Appetito, niente ora della pesata, niente valutazione qualitativa della sessione di allenamento, niente note allenamento libere, cardio resta nel Piano (non torna nel Check-in giornaliero), dati anagrafici (nome/età/data pagamento/documenti) saltati del tutto.

**Prossimo passo**: coerente con la modalità di lavoro di questa sessione, si passa a mockup su Claude Design per i pezzi con superficie visiva nuova (F2, F3, F6, F7/F8) prima di scrivere codice vero. F1 e F5 sono più "sotto il cofano" (pattern dati, query) e potrebbero non aver bisogno di mockup dedicati.

## Prossimi passi consigliati (ordine sensato)

*(elenco originale del 2026-07-15, mantenuto per riferimento — vedi sotto per lo stato aggiornato al 2026-07-16)*

1. ~~**D1** (font Inter Tight)~~ ✅ fatto
2. ~~**I1** (chiarire lo stato del repo git)~~ ✅ fatto
3. ~~**I2** (verificare RLS su Supabase)~~ ✅ fatto
4. **D2** (decidere se uniformare il linguaggio visivo) — ancora aperto
5. Pulizia codice morto (sezione 3) — ancora da fare
6. Il resto (D3, D5-D7, B1-B4, sezione 5) — via via, non urgente

### Aggiornamento 2026-07-16 — prossimi passi

Con la modalità demo, il log allenamento e le misure corporee esplicitamente rimandati, l'ordine consigliato ora è:

1. **X1 e X2** (collegamenti mancanti Planning↔Piano e Meal Plan↔Oggi) — sono le due decisioni strutturali più importanti rimaste: da queste dipende come riorganizzare visivamente Piano, Planning e Meal Plan. Deciderle prima evita di lavorare due volte.
2. **B5, B6, B7** (Reset dati rotto, note settimanali che si perdono, bottone Salva placebo) — bug concreti, priorità alta perché B6 è perdita silenziosa di dati dell'utente.
3. **D2** (vecchio vs nuovo stile) — ancora aperto, i confronti sono pronti su Claude Design.
4. Riorganizzazione sezione per sezione (sezione 8) — una volta chiarite X1/X2, applicare le proposte tab per tab.
5. Kicker: estendere agli altri tab (D4) ora che lo stile è deciso (D4b).
6. Il resto (pulizia codice morto, rifiniture minori) quando c'è tempo.
