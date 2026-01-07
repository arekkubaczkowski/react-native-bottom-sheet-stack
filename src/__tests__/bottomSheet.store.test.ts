import { useBottomSheetStore } from '../bottomSheet.store';

describe('BottomSheetStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    useBottomSheetStore.getState().clearAll();
  });

  describe('push mode', () => {
    it('should add a new sheet to the stack with opening status', () => {
      const { push } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      const { stack } = useBottomSheetStore.getState();
      expect(stack).toHaveLength(1);
      expect(stack[0]).toMatchObject({
        id: 'sheet1',
        groupId: 'default',
        status: 'opening',
      });
    });

    it('should not add a duplicate sheet', () => {
      const { push } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      const { stack } = useBottomSheetStore.getState();
      expect(stack).toHaveLength(1);
    });

    it('should stack multiple sheets', () => {
      const { push } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      push({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      const { stack } = useBottomSheetStore.getState();
      expect(stack).toHaveLength(2);
      expect(stack[0]?.id).toBe('sheet1');
      expect(stack[1]?.id).toBe('sheet2');
    });
  });

  describe('switch mode', () => {
    it('should hide the current sheet and add a new sheet on top', () => {
      const { push, switch: switchSheet } = useBottomSheetStore.getState();

      // First, push a sheet
      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      // Manually set it to 'open' status (simulating the opening animation completing)
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      // Now switch to a new sheet
      switchSheet({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack).toHaveLength(2);
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'hidden',
      });
      expect(newStack[1]).toMatchObject({
        id: 'sheet2',
        status: 'opening',
      });
    });

    it('should not switch to a sheet that already exists', () => {
      const { push, switch: switchSheet } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      switchSheet({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      const { stack } = useBottomSheetStore.getState();
      expect(stack).toHaveLength(1);
    });

    it('should restore the hidden sheet when the switched sheet is closed', () => {
      const {
        push,
        switch: switchSheet,
        startClosing,
      } = useBottomSheetStore.getState();

      // Setup: Push sheet1, then switch to sheet2
      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      switchSheet({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      // Manually set sheet2 to 'open' status
      const currentStack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [currentStack[0]!, { ...currentStack[1]!, status: 'open' }],
      });

      // Now close sheet2
      startClosing('sheet2');

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack).toHaveLength(2);
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'opening', // Should be restored to 'opening'
      });
      expect(newStack[1]).toMatchObject({
        id: 'sheet2',
        status: 'closing',
      });
    });

    it('should remove the closed sheet and keep the restored sheet', () => {
      const {
        push,
        switch: switchSheet,
        startClosing,
        finishClosing,
      } = useBottomSheetStore.getState();

      // Setup: Push sheet1, then switch to sheet2
      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      switchSheet({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      const currentStack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [currentStack[0]!, { ...currentStack[1]!, status: 'open' }],
      });

      // Close sheet2
      startClosing('sheet2');
      finishClosing('sheet2');

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack).toHaveLength(1);
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'opening',
      });
    });
  });

  describe('replace mode', () => {
    it('should replace the current sheet with a new one', () => {
      const { push, replace } = useBottomSheetStore.getState();

      // First, push a sheet
      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      // Replace with a new sheet
      replace({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack).toHaveLength(2);
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'closing',
      });
      expect(newStack[1]).toMatchObject({
        id: 'sheet2',
        status: 'opening',
      });
    });

    it('should not replace with a sheet that already exists', () => {
      const { push, replace } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      replace({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      const { stack } = useBottomSheetStore.getState();
      expect(stack).toHaveLength(1);
    });
  });

  describe('startClosing', () => {
    it('should set the sheet status to closing', () => {
      const { push, startClosing } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      startClosing('sheet1');

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'closing',
      });
    });

    it('should not close a hidden sheet', () => {
      const {
        push,
        switch: switchSheet,
        startClosing,
      } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      switchSheet({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      // Try to close the hidden sheet
      startClosing('sheet1');

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'hidden', // Should remain hidden
      });
    });

    it('should restore hidden sheet below when closing a sheet', () => {
      const {
        push,
        switch: switchSheet,
        startClosing,
      } = useBottomSheetStore.getState();

      // Setup: Push sheet1, then switch to sheet2
      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      switchSheet({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      const currentStack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [currentStack[0]!, { ...currentStack[1]!, status: 'open' }],
      });

      // Close sheet2 - should restore sheet1
      startClosing('sheet2');

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'opening',
      });
    });
  });

  describe('finishClosing', () => {
    it('should remove the sheet from the stack', () => {
      const { push, startClosing, finishClosing } =
        useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      startClosing('sheet1');
      finishClosing('sheet1');

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack).toHaveLength(0);
    });

    it('should restore hidden sheet at the top after removing a sheet', () => {
      const {
        push,
        switch: switchSheet,
        finishClosing,
      } = useBottomSheetStore.getState();

      // Setup: Push sheet1, then switch to sheet2
      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      let stack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [{ ...stack[0]!, status: 'open' }],
      });

      switchSheet({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      const currentStack = useBottomSheetStore.getState().stack;
      useBottomSheetStore.setState({
        stack: [
          { ...currentStack[0]!, status: 'hidden' },
          { ...currentStack[1]!, status: 'closing' },
        ],
      });

      // Remove sheet2 - should restore sheet1 if it's hidden
      finishClosing('sheet2');

      const newStack = useBottomSheetStore.getState().stack;
      expect(newStack).toHaveLength(1);
      expect(newStack[0]).toMatchObject({
        id: 'sheet1',
        status: 'opening',
      });
    });
  });

  describe('clearAll', () => {
    it('should remove all sheets from the stack', () => {
      const { push, clearAll } = useBottomSheetStore.getState();

      push({
        id: 'sheet1',
        groupId: 'default',
        content: 'Sheet 1',
      });

      push({
        id: 'sheet2',
        groupId: 'default',
        content: 'Sheet 2',
      });

      clearAll();

      const { stack } = useBottomSheetStore.getState();
      expect(stack).toHaveLength(0);
    });
  });
});
