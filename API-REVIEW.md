# Przegląd API — `react-native-bottom-sheet-stack`

Przegląd całej powierzchni API (publicznej i wewnętrznej) pod kątem spójności,
łatwości użycia i utrzymania. Stan na commit bazowy: bump swmansion do 0.16.2.

Wszystkie ustalenia pochodzą z czytania kodu. **Nic nie zostało uruchomione na
urządzeniu ani pokryte testem** — repo nie ma suite'u testowego. Tam, gdzie
odróżnienie „bug” od „zamierzone” wymaga uruchomienia, jest to zaznaczone.

Numeracja: `B*` = bug, `P*` = publiczne API, `W*` = wewnętrzne, `M*` = martwy kod.

---

## 1. Bugi

### B1. Izolacja grup jest złamana w trzech miejscach — **priorytet 1**

`BottomSheetManagerProvider` obiecuje niezależne grupy („Each group has its own
stackOrder”). Store trzyma jednak **jeden globalny `stackOrder`**, a trzy operacje
sięgają do niego bez filtrowania po `groupId`:

| Miejsce | Kod | Skutek |
|---|---|---|
| `store.ts:37` | `applyModeToTopSheet(sheetsById, state.stackOrder, mode)` | `mode: 'switch'`/`'replace'` w grupie B ukrywa/zamyka sheet z grupy A |
| `store.ts:118` | `getTopSheetId(newStackOrder)` | Po zamknięciu sheeta w grupie B auto-przywracany jest ukryty sheet z grupy A |
| `store.ts:92` | `getSheetBelowId(state.stackOrder, id)` | `startClosing` przywraca sheet „poniżej” z innej grupy |

Dla porównania — te same operacje **filtrują** poprawnie w `initBottomSheetCoordinator`,
`useSheetRenderData`, `closeAllAnimated` i `clearGroup`. Czyli inwariant jest znany,
tylko niekonsekwentnie stosowany.

**Naprawa:** przekazać `groupId` do trzech helperów i filtrować, albo — czyściej —
trzymać `stackOrder` per grupa: `stackOrderByGroup: Record<string, string[]>`.
To drugie eliminuje całą klasę tych błędów strukturalnie i upraszcza selektory.

### B2. Wyciek refów przy odrzuconym `open()` — **priorytet 1**

`useBottomSheetManager.open()` (`useBottomSheetManager.tsx:36-38`):

```ts
const id = options.id || Math.random().toString(36);
const ref = React.createRef<SheetAdapterRef>();
setSheetRef(id, ref);          // ← zapis do globalnej mapy
// ...
storeOpen({ id, ... });        // ← store może to CICHO odrzucić (B3)
return id;
```

`cleanupSheetRef(id)` jest wołane wyłącznie w `useEffect` cleanup w `QueueItem`.
Jeśli store odrzuci otwarcie, `QueueItem` nigdy się nie montuje → wpis w
`sheetRefsMap` zostaje **na zawsze**. Przy losowym ID każde odrzucone otwarcie to
nowy, nieusuwalny wpis. `useBottomSheetControl` ma ten sam kształt, ale ze stałym
ID, więc wyciek jest ograniczony do jednego wpisu.

**Naprawa:** rejestrować ref dopiero po potwierdzeniu, że store przyjął sheet —
co wymaga, żeby `open()` zwracał wynik (patrz B3).

### B3. `open()` bywa cichym no-opem

`store.ts:28-35` — dwa guardy przerywają otwarcie bez żadnego sygnału:

```ts
if (existingSheet && !isActivatableKeepMounted(existingSheet)) return state;
const hasOpeningInGroup = Object.values(state.sheetsById).some(
  (s) => s.groupId === sheet.groupId && s.status === 'opening');
if (hasOpeningInGroup) return state;
```

Drugi guard jest zależny od czasu: dwa `open()` w tym samym ticku (albo drugi w
trakcie animacji otwierania pierwszego) → drugi znika. Wywołujący dostaje `id`
i nie ma jak stwierdzić, że nic się nie stało. To jest źródło zgłoszeń typu
„czasem sheet się nie otwiera”.

**Naprawa:** `open()` zwraca `{ id, opened: boolean }` albo `string | null`,
plus `console.warn` w `__DEV__` z powodem odrzucenia.

### B4. Warunkowe wywołanie hooków w `useOnBeforeClose`

`useOnBeforeClose.ts:75-84`:

```ts
const context = useMaybeBottomSheetContext();
const setPreventDismiss = useSetPreventDismiss();
if (!context?.id) throw new Error(...);        // ← throw PRZED kolejnymi hookami
const stableCallback = useEvent(callback);      // hook #3
useEffect(...);                                 // hook #4
```

Jeśli kontekst zniknie między renderami (odmontowywanie sheeta, `clearGroup`
w trakcie fast refresh), liczba wywołanych hooków spada z 4 do 2 → React rzuca
„Rendered fewer hooks than expected”, maskując prawdziwą przyczynę.

`useBottomSheetContext` ma odwrotny, poprawny układ (wszystkie hooki, potem
throw) — ale za cenę wołania selektorów z `''` jako ID.

**Naprawa:** wywołać wszystkie hooki, potem rzucić. Wzorzec ujednolicić między
oboma hookami.

### B5. `animatedIndex` binarny w trzech adapterach → backdrop skacze

Kontrakt `animatedIndex` (`-1` ukryty → `0` otwarty) jest realizowany na dwa
niekompatybilne sposoby:

| Adapter | Sposób | Backdrop |
|---|---|---|
| `GorhomSheetAdapter` | shared value oddany bibliotece | płynny |
| `SwmansionSheetAdapter` | pisany z natywnego `onPositionChange` | płynny |
| `CustomModalAdapter` | `animatedIndex.set(0)` / `set(-1)` | **skok** |
| `ReactNativeModalAdapter` | `set(0)` / `set(-1)` | **skok** |
| `ActionsSheetAdapter` | `set(0)` / `set(-1)` | **skok** |

`CustomModalAdapter` jest tu najbardziej wymowny: ma własny `progress` animowany
przez `withTiming(…, 300ms)`, a `animatedIndex` ustawia skokowo w tym samym
`expand()`. Modal wjeżdża przez 300 ms, backdrop pojawia się natychmiast na 100 %.

To dokładnie ten sam objaw, który był zgłoszony dla swmansion — tylko tam wynikał
z bramki czasowej w backdropie, a tu jest wbudowany w adaptery.

**Naprawa:** dla adapterów z własną animacją — `animatedIndex.value = withTiming(0, cfg)`
z tą samą konfiguracją co animacja sheeta; dla `CustomModalAdapter` wprost pochodna
od istniejącego `progress` (`useDerivedValue(() => progress.value - 1)`).

### B6. Mutacja refa wewnątrz selektora zustanda

`useScaleAnimation.ts:63-92` — `useSheetScaleDepth`:

```ts
const result = useBottomSheetStore((state) => {
  if (sheetIndex === -1) return prevDepthRef.current;   // odczyt
  // ...
  prevDepthRef.current = depth;                          // ← zapis w selektorze
  return depth;
});
```

Selektor zustanda musi być czysty — jest wołany przy każdej zmianie store'a,
potencjalnie wielokrotnie na render i podwójnie w StrictMode. Mutacja daje wynik
zależny od liczby wywołań. Intencja (utrzymać ostatnią głębokość, gdy sheet
wypadł ze stacku, żeby animacja wyjścia nie skoczyła) jest słuszna, implementacja
nie.

**Naprawa:** selektor zwraca `sheetIndex === -1 ? null : depth`, a „ostatnia znana
wartość” jest utrzymywana w `useEffect` albo w samym shared value.

### B7. Sheet może utknąć w `'closing'`

`bottomSheetCoordinator.ts:24-40`:

```ts
const ref = getSheetRef(id)?.current;      // odczyt raz, na górze
switch (status) {
  case 'opening':
    requestAnimationFrame(() => { getSheetRef(id)?.current?.expand(); });  // świeży odczyt
    break;
  case 'hidden':
  case 'closing':
    ref?.close();                          // ← stale ref, bez retry
}
```

Dwie różne strategie w jednym switchu. Jeśli `ref.current` jest jeszcze `null`
(adapter nie zdążył się zamontować — realne dla portalu, gdzie treść musi
najpierw przeteleportować się do `PortalHost`), `ref?.close()` jest cichym
no-opem. Nikt nie zawoła `handleClosed()`, więc sheet zostaje w `'closing'`
bezterminowo: nie renderuje się poprawnie i blokuje `hasOpeningInGroup` (B3) dla
całej grupy.

**Naprawa:** ta sama strategia co dla `expand` (odczyt w rAF + weryfikacja
statusu), plus watchdog w `__DEV__` ostrzegający o sheecie wiszącym w stanie
przejściowym.

### B8. `closeAllAnimated` — `indexOf` w pętli

`bottomSheetCoordinator.ts:152`:

```ts
if (stagger > 0 && reversed.indexOf(sheetId) < reversed.length - 1) {
```

`indexOf` w pętli po tej samej tablicy: O(n²) i zwraca **pierwsze** wystąpienie.
Przy realnych rozmiarach stacku koszt jest nieistotny, ale semantyka jest błędna,
a indeks pętli jest tuż obok i darmowy.

### B9. `requestClose` zwraca `true`, gdy nic nie zrobił

`bottomSheetCoordinator.ts:100-104` — dla sheeta w stanie `'hidden'` (albo
nieistniejącego) funkcja przechodzi obok `if (currentStatus === 'open' || …)`
i zwraca `true`. Wartość zwracana znaczy „interceptor nie zablokował”, a nie
„sheet się zamyka” — czego nazwa i dokumentacja nie oddają.

---

## 2. Publiczne API — niespójności

### P1. `close()` gubi informację o zablokowaniu

```ts
requestClose(id)                       → Promise<boolean>   // low-level, publiczne
useBottomSheetManager().close(id)      → void               // Promise porzucony
useBottomSheetControl().close()        → void               // Promise porzucony
useBottomSheetContext().close()        → void               // Promise porzucony
useBottomSheetManager().closeAll()     → Promise<void>      // zwracany
```

`onBeforeClose` może zablokować zamknięcie, ale żaden z trzech głównych
`close()` tego nie sygnalizuje. Żeby się dowiedzieć, trzeba zejść do
`requestClose` — czyli do API dla autorów adapterów. Jednocześnie `closeAll`
Promise zwraca, więc reguła nie jest nawet spójna wewnątrz jednego hooka.

**Propozycja:** wszystkie `close()` zwracają `Promise<boolean>`. Zmiana jest
wstecznie zgodna — kto ignorował `void`, dalej może ignorować.

### P2. `clear()` i `closeAll()` — nazwy nie oddają różnicy

```ts
closeAll()  // animowana kaskada, respektuje onBeforeClose, async
clear()     // natychmiastowe wyrzucenie ze store'u, POMIJA onBeforeClose, sync
```

`clear()` brzmi jak porządkowanie, a jest twardym resetem, który omija cały
mechanizm ochrony przed utratą danych. Dodatkowo `clearAll` jest zdeprecjonowanym
aliasem `clear` — a nazwa `clearAll` sugeruje związek z `closeAll`, z którym nie
ma nic wspólnego.

**Propozycja:** `destroyAll()` / `resetGroup()` z jawnym JSDoc „pomija
onBeforeClose, bez animacji — do teardownu, nie do zamykania”.

### P3. `params` są niedostępne dla sheetów inline

`useBottomSheetControl.open()` przyjmuje `params`. `useBottomSheetManager.open()`
— nie. Ale `useBottomSheetContext()` zwraca `params` **zawsze**, więc w sheecie
inline to na stałe `undefined`. Store i `BottomSheetState` obsługują `params`
niezależnie od trybu — ogranicza tylko powierzchnia hooka.

Dla inline są one częściowo zbędne (można domknąć wartości w JSX), ale
asymetria nie jest nigdzie udokumentowana i wygląda na przeoczenie.

### P4. `isOpen` obejmuje `'opening'`

```ts
isOpen: status === 'open' || status === 'opening'
```

Nazwa mówi „jest otwarty”, wartość znaczy „jest otwarty lub się otwiera”. Brak
sposobu, żeby odróżnić stan interaktywny od animacji — a jest to rozróżnienie,
którego sama libka używa wewnętrznie (`useBackHandler` reaguje wyłącznie na
`status === 'open'`).

**Propozycja:** dołożyć `isOpening` / `isClosing` / `isVisible`, a `isOpen`
zawęzić do `status === 'open'` (breaking — do 2.0).

### P5. `useBottomSheetStatus(id: string)` bez wsparcia typów

Cała reszta type-safe API operuje na `BottomSheetPortalId`. Tu jest gołe
`string`, bo ID sheetów inline są losowe. Skutek: zero podpowiedzi dla
zarejestrowanych ID.

**Propozycja:** `id: BottomSheetPortalId | (string & {})` — autouzupełnianie dla
zarejestrowanych, dowolny string nadal przechodzi.

### P6. Wnętrze store'u jest publiczne

```ts
export { useBottomSheetStore } from './bottomSheet.store';
export type { BottomSheetState } from './bottomSheet.store';
```

`useBottomSheetStore` daje pełny dostęp do stanu i wszystkich akcji — w tym
`markOpen`, `finishClosing`, `mount`, `unmount`, które mają sens tylko dla
koordynatora. `BottomSheetState` eksponuje `content`, `portalSession`
i `preventDismiss` — czyste szczegóły implementacyjne. Każda zmiana kształtu
store'u to od teraz breaking change.

**Propozycja:** oznaczyć `@internal`, wystawić zamiast tego wąskie selektory
(`useSheetStatus`, `useSheetParams`), a publiczny `BottomSheetState` zawęzić do
`Pick<…, 'id' | 'groupId' | 'status' | 'params'>`.

### P7. Autor custom adaptera nie ma kompletu narzędzi

Wszystkie wbudowane adaptery używają `useSetBackdrop(id, false)`, żeby wyłączyć
backdrop managera, gdy mają własny. **Ta funkcja nie jest eksportowana** z
głównego entry (`useSheetPreventDismiss` również nie — choć `preventDismiss`
jest dostępne okrężnie przez `useBottomSheetContext()`).

Czyli: adapter napisany według `docs/custom-adapters.md` nie może osiągnąć
jakości wbudowanych. Sekcja „Adapter utilities (for custom adapter authors)”
w `index.tsx` jest niekompletna.

### P8. Narzędzia testowe w głównym entry

`__resetSheetRefs`, `__resetAnimatedIndexes`, `__getAllAnimatedIndexes`,
`__resetPortalSessions`, `__resetOnBeforeClose` — pięć symboli w produkcyjnym
bundlu, z prefiksem `__`, ale bez `@internal`.

**Propozycja:** subpath `react-native-bottom-sheet-stack/testing`, spójny
z istniejącym wzorcem subpath exports dla adapterów.

### P9. Deprecated API bez horyzontu usunięcia

`openBottomSheet`, `clearAll`, `closeBottomSheet`, `useBottomSheetState`,
`ModalAdapter`, `BottomSheetManaged`, `BottomSheetManagedProps`, oraz
nieoznaczony alias `SheetAdapterRef as BottomSheetRef`.

Osiem aliasów przy wersji 1.18.4. Żaden nie mówi, w której wersji zniknie.

### P10. Dwie klasy jakości adapterów

```ts
// swmansion / gorhom — typowane
interface SwmansionSheetAdapterProps extends Omit<BottomSheetProps, …> {}

// actions-sheet / react-native-modal — bez typów
interface ActionsSheetAdapterProps { children: ReactNode; [key: string]: unknown; }
```

`[key: string]: unknown` wyłącza kontrolę typów — literówka w propie przechodzi
bez słowa. Obie biblioteki dostarczają typy, więc jest z czego skorzystać.

---

## 3. Wewnętrzne — spójność i utrzymanie

### W1. Trzy konwencje nazw dla hooków kontekstowych

| Plik | Hook |
|---|---|
| `BottomSheet.context.ts` | `useMaybeBottomSheetContext` |
| `BottomSheetRef.context.ts` | `useBottomSheetRefContext` |
| `BottomSheetDefaultIndex.context.ts` | `useBottomSheetDefaultIndex` |
| `BottomSheetManager.**provider**.tsx` | `useBottomSheetManagerContext` + `useMaybe…` |

Do tego hook managera mieszka w pliku providera, a nie kontekstu — mimo że plik
`BottomSheetManager.context.tsx` istnieje i zawiera sam kontekst.

### W2. Dwie warstwy re-eksportu store'u

`bottomSheet.store.ts` to jedna linia `export * from './store'`. Importy w
kodzie idą raz przez `./bottomSheet.store`, raz przez `./store` — bez różnicy
semantycznej. Warstwa do usunięcia.

### W3. `TriggerState` zdefiniowany, ale niekonsekwentnie używany

```ts
export type TriggerState = Omit<BottomSheetState, 'status'>;
open(sheet: TriggerState, mode?: OpenMode): void;
mount(sheet: Omit<BottomSheetState, 'status'>): void;   // ← ten sam typ, rozpisany
```

### W4. `open()` przyjmuje kształt, który miesza dwa rozłączne tryby

`useBottomSheetControl` przekazuje `content: null`, mimo że `content` jest
opcjonalne — bo bez tego nie widać, że to sheet portalowy. Tryb jest zakodowany
w kombinacji `usePortal` + `keepMounted` + `content`, gdzie realne są tylko trzy
kombinacje z ośmiu.

**Propozycja:** discriminated union:

```ts
type OpenPayload =
  | { kind: 'inline';     id: string; groupId: string; content: ReactNode; … }
  | { kind: 'portal';     id: string; groupId: string; … }
  | { kind: 'persistent'; id: string; groupId: string; … };
```

Czyni trzy tryby z dokumentacji jawnymi w typach i eliminuje `content: null`.

### W5. `MODE_STATUS_MAP` używa `null` jako „brak akcji”

Wymusza `if (!targetStatus) return sheetsById;` — działa, ale `push` nie jest
„brakiem statusu”, tylko „nie ruszaj poprzedniego”. Czytelniej jako jawna gałąź.

### W6. `shallow` na selektorach zwracających prymitywy

Osiem z jedenastu selektorów w `store/hooks.ts` zwraca `string | boolean |
number | undefined` i mimo to przechodzi przez `shallow`. Porównanie
referencyjne wystarcza; `shallow` tylko dokłada wywołanie. Realnie potrzebują go
`useSheet` i `useSheetParams`.

### W7. Kolizja nazwy `useEvent`

`src/useEvent.ts` (RFC useEvent) i `useEvent` z `react-native-reanimated`
(handler natywnych eventów) — dwie zupełnie różne rzeczy pod tą samą nazwą,
używane w tym samym repo, a w `SwmansionSheetAdapter` importowane obok siebie.

**Propozycja:** przemianować własny na `useStableCallback`.

### W8. `useBottomSheetContext` woła selektory z `''`

```ts
const params = useSheetParams(context?.id || '');
```

Działa (selektor zwróci `undefined`), ale pusty string jako „brak ID” to
niepisana konwencja rozsiana po kodzie.

---

## 4. Martwy kod

Zero użyć w `src/` i `example/`:

| Symbol | Plik |
|---|---|
| `isOpening` | `store/helpers.ts` |
| `useSheet` | `store/hooks.ts` |
| `useIsSheetOpen` | `store/hooks.ts` |
| `useHasScaleBackgroundAbove` | `store/hooks.ts` |
| `getCurrentPortalSession` | `portalSessionRegistry.ts` |
| `useTracePropChanges` | `useTracePropChanges.ts` (cały plik — narzędzie debugowe z `console.log`) |

Żaden nie jest eksportowany publicznie z `index.tsx`, więc usunięcie nie jest
breaking changem. `setAnimatedIndexValue` ma 1 użycie — i jest publiczny mimo
że duplikuje `useAnimatedIndex()`.

---

## 5. Proponowana kolejność

**Etap 1 — bugi, bez zmian API (patch):**
B1 (izolacja grup), B2 (wyciek refów), B4 (warunkowe hooki), B6 (mutacja
w selektorze), B7 (utknięcie w `'closing'`), B8, B9.

**Etap 2 — spójność zachowań (minor):**
B5 (`animatedIndex` w trzech adapterach — najbardziej widoczna poprawa jakości),
B3 (`open()` zwraca wynik + dev warn), P1 (`close()` zwraca `Promise<boolean>`),
P7 (eksport `useSetBackdrop`), P5 (typowanie `useBottomSheetStatus`),
P10 (typy w dwóch adapterach), M* (martwy kod).

**Etap 3 — porządek (2.0):**
P2 (`clear` → `destroyAll`), P4 (`isOpen`), P6 (`@internal` na store), P8
(subpath `/testing`), P9 (usunięcie deprecated), W1/W2/W3/W4/W7 (nazewnictwo
i struktura).

Rekomendacja: **stackOrder per grupa (B1) zrobić przed resztą** — to jedyna
zmiana strukturalna, dotyka store'u, helperów i selektorów, i najłatwiej ją
wprowadzić, zanim inne poprawki osiądą na obecnym kształcie.
