# Pre-commit Checklist\n\nAntes de enviar cambios, verifica lo siguiente:\n\n1. \[ \] Ejecuta linters/tests relevantes:\n   - Backend: cd services/api && ./.venv/Scripts/python manage.py test (o pytest si aplica)\n   - Web: cd apps/web && npm run lint\n   - Operator App: cd apps/operator-mobile && npm run lint\n   - Android: cd apps/android && ./gradlew lintDebug assembleDebug\n2. \[ \] Actualiza migraciones si cambiaste modelos (python manage.py makemigrations).\n3. \[ \] Revisa git status y elimina archivos temporales/secretos.\n4. \[ \] Formatea/ordena c�digo (Prettier, Black, ktlint, etc.).\n5. \[ \] Sincroniza env docs si agregaste variables (docs/setup_v2.md, .env.example).\n6. \[ \] A�ade notas en docs/CHANGELOG o progreso si aplica.\n7. \[ \] Prueba funciones cr�ticas manualmente (autenticaci�n, uploads, pagos, mapa).\n8. \[ \] Ejecuta 
pm run build (web) y ./gradlew assembleDebug (android) si hubo cambios de build.\n9. \[ \] Actualiza README/diagramas cuando cambie arquitectura.

## Common React Errors to Avoid

### ❌ "Maximum update depth exceeded" - Infinite Loop Bug

**What it is:** This error occurs when a component enters an infinite render loop, typically caused by `setState` being called inside `useEffect` without proper dependency management.

**Symptoms:**
- Console shows thousands of identical warnings per second
- App freezes or becomes unresponsive
- Browser tab uses 100% CPU
- Error stack trace points to `MapView.jsx` or your component

```javascript
// ❌ BAD - INFINITE LOOP
const MyComponent = () => {
  const [count, setCount] = useState(0);
  
  // useEffect calls setCount without dependencies
  useEffect(() => {
    setCount(count + 1); // This causes a re-render
  }); // Missing dependency array! Runs on EVERY render
};

// ❌ BAD - FUNCTION DEPENDENCIES LOOP
const updateState = (updates) => {
  setAnimationState(prev => ({ ...prev, ...updates }));
};

const completeAutoFly = () => {
  updateState({ completed: true }); // Uses updateState
};

useEffect(() => {
  completeAutoFly(); // This triggers a re-render
}, [completeAutoFly]); // completeAutoFly changes on every render → infinite loop
```

**Root Causes:**
1. **Missing dependency array** → useEffect runs on every render
2. **Functions in dependencies** → Callback references change every render
3. **State updates inside useEffect with that state in dependencies** → Creates circular dependency
4. **Incomplete dependency arrays** → Missing variables that change frequently

**✅ CORRECT SOLUTIONS:**

**Option 1: Fix useCallback dependencies**
```javascript
const updateState = useCallback((updates) => {
  setAnimationState(prev => ({ ...prev, ...updates }));
}, []); // Empty deps - this function never changes

const completeAutoFly = useCallback(() => {
  updateState({ completed: true });
}, [updateState]); // Now completeAutoFly is stable
```

**Option 2: Remove unstable functions from dependencies**
```javascript
useEffect(() => {
  if (shouldFly) {
    autoFlightAttemptedRef.current = true;
    performAutoFlight('chile');
  }
}, [isMapReady, shouldFly]); // Only stable dependencies, not performAutoFlight
```

**Option 3: Use refs to store mutable values**
```javascript
const autoFlightAttemptedRef = useRef(false); // Won't cause re-renders

useEffect(() => {
  if (!autoFlightAttemptedRef.current && isMapReady) {
    autoFlightAttemptedRef.current = true;
    performAutoFlight();
  }
}, [isMapReady]); // performAutoFlight not in deps anymore
```

**Prevention Checklist:**
- ✅ Always include a dependency array in useEffect
- ✅ Put ONLY the values you actually use in the dependency array
- ✅ For callbacks that depend on state, make sure they're in useCallback with correct deps
- ✅ Use refs (useRef) for mutable values that shouldn't trigger re-renders
- ✅ If you see thousands of warnings/second → check your useEffect dependencies immediately

**How SkyTerra Fixed This:**
- Added `updateAnimationState` to callback dependencies
- Removed function callbacks from useEffect dependencies
- Used refs (`autoFlightAttemptedRef`) to track state without re-renders
