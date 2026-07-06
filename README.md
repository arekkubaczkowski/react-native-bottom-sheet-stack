**Hello, it is not possible to create an Issue as Discussion are disabled on the repository.**


I do enjoy this library, but it is not working on Expo 57 (following a worklets update)

I do have this error : `[Worklets] Cannot copy value of type NativeWorklets.`

I am getting help from AI (Claude) and it pointed me to the fact that the library shipped precompile CommonJS. It managed to fix the issue by relying only on tsx in my metro config.


<details>
Here is the AI report

**The symptom**

Opening any bottom sheet → [Worklets] Cannot copy value of type NativeWorklets.

**What a worklet needs**

A worklet runs on the UI thread. To get there, Reanimated/Worklets serializes the worklet + everything its closure captures, and copies it across threads. Serializable = primitives, plain objects, arrays, other worklets, functions. Not serializable = the WorkletsModule native singleton (an instance of class NativeWorklets).

The offending worklet
```
GorhomSheetAdapter (in the sheet-stack) has:
import { scheduleOnRN } from 'react-native-worklets'
...
useAnimatedReaction(
  () => externalAnimatedIndex?.value,
  (value) => {
    externalAnimatedIndex?.set(value)
    if (opened) scheduleOnRN(handleOpened)   // ← calls a worklets API inside the worklet
  },
)
```
That reaction worklet references scheduleOnRN. Fine in source — the Worklets Babel plugin recognizes a direct named import from react-native-worklets and marks it a global (available on the UI runtime, not captured in the closure).

**Why it broke**

The library ships precompiled CommonJS (lib/commonjs), and your app imports react-native-bottom-sheet-stack/gorhom, which its exports map resolves to that compiled build. In CJS the named import became a namespace access:
```
var _reactNativeWorklets = require("react-native-worklets");   // whole module object
...
(0, _reactNativeWorklets.scheduleOnRN)(handleOpened);           // member access inside the worklet
```
Now the Babel worklets plugin (running in your app on this already-compiled code) sees _reactNativeWorklets.scheduleOnRN — a member access on a local variable, not a recognizable named import. It can't hoist that as a global, so to be safe it captures the whole _reactNativeWorklets namespace object into the worklet closure.

</details>
