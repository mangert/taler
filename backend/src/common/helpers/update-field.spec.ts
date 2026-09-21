import { getUpdateFieldState } from './update-field.js';

interface UpdateProbeDto {
  description?: string | null;
}

describe('getUpdateFieldState', () => {
  it('distinguishes an omitted field from an explicit null', () => {
    const omitted: UpdateProbeDto = {};
    const cleared: UpdateProbeDto = { description: null };

    expect(getUpdateFieldState(omitted, 'description')).toEqual({
      isProvided: false,
    });
    expect(getUpdateFieldState(cleared, 'description')).toEqual({
      isProvided: true,
      value: null,
    });
  });

  it('preserves a provided update value', () => {
    const updated: UpdateProbeDto = { description: 'Updated memo' };

    expect(getUpdateFieldState(updated, 'description')).toEqual({
      isProvided: true,
      value: 'Updated memo',
    });
  });
});
