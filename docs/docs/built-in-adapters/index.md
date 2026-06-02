---
slug: /built-in-adapters
sidebar_label: Overview
---

# Shipped Adapters

All adapters listed below ship with the library. `CustomModalAdapter` requires no additional dependencies. The others wrap optional peer dependencies — install only what you use.

| Adapter | Import | Wraps |
| --- | --- | --- |
| [GorhomSheetAdapter](./gorhom.md) | `react-native-bottom-sheet-stack/gorhom` | `@gorhom/bottom-sheet` |
| [SwmansionSheetAdapter](./swmansion.md) | `react-native-bottom-sheet-stack/swmansion` | `@swmansion/react-native-bottom-sheet` (Fabric / New Arch) |
| [CustomModalAdapter](./custom-modal.md) | `react-native-bottom-sheet-stack` | Custom animated view (zero deps) |
| [ReactNativeModalAdapter](./react-native-modal.md) | `react-native-bottom-sheet-stack/react-native-modal` | `react-native-modal` |
| [ActionsSheetAdapter](./actions-sheet.md) | `react-native-bottom-sheet-stack/actions-sheet` | `react-native-actions-sheet` |

Each sheet in the stack can use a different adapter. See [Library-Agnostic Architecture](/adapters) for how adapters work, or [Building Custom Adapters](/custom-adapters) to create your own.
