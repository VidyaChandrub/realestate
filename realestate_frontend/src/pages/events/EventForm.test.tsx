import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EventForm from './EventForm';
import {
  CATEGORY,
  CITY_BLR,
  CITY_MUM,
  CITY_SF,
  COUNTRY_IN,
  COUNTRY_US,
  EDU_BTECH,
  EXP_JUNIOR,
  MOCK_EVENT,
  ORGANIZATION,
  SKILL_NODE,
  SKILL_REACT,
  STATE_CA,
  STATE_KA,
  STATE_MH,
} from './__fixtures__/eventFormData';

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Replace Radix Select with a native <select> to avoid scrollIntoView/portal
// issues in jsdom. SelectTrigger is null because the <select> itself is the
// trigger; SelectContent renders its option children directly inside it.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: any) => (
    <select value={value ?? ''} onChange={(e) => onValueChange?.(e.target.value)} disabled={disabled}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
  SelectGroup: ({ children }: any) => <>{children}</>,
  SelectLabel: ({ children }: any) => <>{children}</>,
  SelectSeparator: () => null,
  SelectScrollUpButton: () => null,
  SelectScrollDownButton: () => null,
}));

vi.mock('@/components/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: any) => any) =>
    selector({ user: { roles: ['EMPLOYER'] }, token: 'test-token' }),
}));

vi.mock('@/lib/jobOrganizationSync', () => ({
  persistJobOrganizations: vi.fn(),
  persistSelectedJobOrganizationId: vi.fn(),
  readStoredJobOrganizationId: () => 'org-1',
  resolveJobOrganizations: (_meData: any, fallback: any[]) => fallback,
  resolveSelectedJobOrganizationId: () => 'org-1',
}));

const mockUseEvent = vi.fn();
const mockUseCreateEvent = vi.fn();
const mockUseUpdateEvent = vi.fn();
const mockUsePublishEvent = vi.fn();
const mockUseEventCategories = vi.fn();

vi.mock('@/hooks/useEvents', () => ({
  useEvent: (...args: any[]) => mockUseEvent(...args),
  useCreateEvent: () => mockUseCreateEvent(),
  useUpdateEvent: () => mockUseUpdateEvent(),
  usePublishEvent: () => mockUsePublishEvent(),
  useEventCategories: () => mockUseEventCategories(),
}));

const mockGetCountries = vi.fn();
const mockGetStatesByCountrySlug = vi.fn();
const mockGetCitiesByStateSlug = vi.fn();
const mockSearchMasterData = vi.fn();
const mockSearchCities = vi.fn();
const mockGetById = vi.fn();
const mockEmployersGetMe = vi.fn();
const mockEmployersList = vi.fn();
const mockEmployersListMine = vi.fn();
const mockGetSkills = vi.fn();
const mockGetExperienceLevels = vi.fn();
const mockGetEducationLevels = vi.fn();

vi.mock('@/api/services', () => ({
  eventsApi: {
    getCountries: () => mockGetCountries(),
    getStatesByCountrySlug: (slug: string) => mockGetStatesByCountrySlug(slug),
    getCitiesByStateSlug: (slug: string) => mockGetCitiesByStateSlug(slug),
    searchMasterData: (value: string, type: string) => mockSearchMasterData(value, type),
    getSkills: () => mockGetSkills(),
    getExperienceLevels: () => mockGetExperienceLevels(),
    getEducationLevels: () => mockGetEducationLevels(),
  },
  masterDataApi: {
    searchCities: (value: string) => mockSearchCities(value),
    getById: (id: string) => mockGetById(id),
  },
  employersApi: {
    getMe: () => mockEmployersGetMe(),
    list: (params: any) => mockEmployersList(params),
    listMine: () => mockEmployersListMine(),
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const queryClients: QueryClient[] = [];

const mutationStub = (impl?: () => Promise<any>) => ({
  mutateAsync: impl ?? vi.fn().mockResolvedValue({ id: 'new-event-1' }),
  isPending: false,
});

function makeQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  queryClients.push(client);
  return client;
}

function renderCreate() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/events/new']}>
        <Routes>
          <Route path="/events/new" element={<EventForm />} />
          <Route path="/events" element={<div data-testid="events-list" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderEdit(eventId: string) {
  const client = makeQueryClient();
  // Pre-seed edit-mode lookup data so population does not depend on background
  // country -> state -> city query cascades after an assertion has finished.
  client.setQueryData(['countries'], [COUNTRY_IN, COUNTRY_US]);
  client.setQueryData(['states', [COUNTRY_IN.id]], [STATE_KA, STATE_MH]);
  client.setQueryData(['cities', [STATE_KA.id]], [CITY_BLR]);
  client.setQueryData(['master-data-item', CITY_BLR.id], CITY_BLR);
  client.setQueryData(['skills'], [SKILL_REACT, SKILL_NODE]);
  client.setQueryData(['experience-levels'], [EXP_JUNIOR]);
  client.setQueryData(['education-levels'], [EDU_BTECH]);

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/events/${eventId}/edit`]}>
        <Routes>
          <Route path="/events/:id/edit" element={<EventForm />} />
          <Route path="/events/:id" element={<div data-testid="event-detail" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Find the native <select> next to a given label text.
function getSelectByLabel(labelText: string) {
  const label = screen.getByText(labelText);
  const container = label.closest('div')!;
  const select = container.querySelector('select');
  if (!select) throw new Error(`No <select> found near label "${labelText}"`);
  return select as HTMLSelectElement;
}

// Click the trigger button of a MultiSelectDropdown identified by its label text.
// The trigger button contains a <span> with the placeholder or "N selected" text.
function getDropdownContainer(labelText: string) {
  const label = screen.getByText(labelText);
  // MultiSelectDropdown renders: <div.space-y-2> <label> label <Popover> <Button> <span>...
  return label.closest('.space-y-2') ?? label.parentElement!;
}

function getDropdownTrigger(labelText: string) {
  const container = getDropdownContainer(labelText);
  const button = container.querySelector('button')!;
  return button as HTMLButtonElement;
}

function clickDropdownTrigger(labelText: string) {
  const button = getDropdownTrigger(labelText);
  fireEvent.click(button);
}

async function openDropdown(labelText: string) {
  const button = getDropdownTrigger(labelText);
  await waitFor(() => expect(button).not.toBeDisabled());
  if (button.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(button);
  }
  await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
}

async function clickDropdownOption(dropdownLabel: string, optionName: string) {
  await openDropdown(dropdownLabel);
  fireEvent.click(await screen.findByRole('checkbox', { name: optionName }));
}

function expectDropdownBadge(dropdownLabel: string, badgeText: string) {
  expect(within(getDropdownContainer(dropdownLabel)).getByText(badgeText)).toBeInTheDocument();
}

function expectNoDropdownBadge(dropdownLabel: string, badgeText: string) {
  expect(within(getDropdownContainer(dropdownLabel)).queryByText(badgeText)).not.toBeInTheDocument();
}

// ── Default mock state ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  mockUseEvent.mockReturnValue({ data: null, isLoading: false });
  mockUseEventCategories.mockReturnValue({ data: [CATEGORY], isLoading: false });
  mockUseCreateEvent.mockReturnValue(mutationStub());
  mockUseUpdateEvent.mockReturnValue(mutationStub());
  mockUsePublishEvent.mockReturnValue(mutationStub());

  mockGetCountries.mockResolvedValue([COUNTRY_IN, COUNTRY_US]);
  mockGetStatesByCountrySlug.mockResolvedValue([STATE_KA, STATE_MH]);
  mockGetCitiesByStateSlug.mockResolvedValue([CITY_BLR, CITY_MUM]);
  mockSearchMasterData.mockResolvedValue([]);
  mockSearchCities.mockResolvedValue([]);
  mockGetById.mockResolvedValue(CITY_BLR);

  mockGetSkills.mockResolvedValue([SKILL_REACT, SKILL_NODE]);
  mockGetExperienceLevels.mockResolvedValue([EXP_JUNIOR]);
  mockGetEducationLevels.mockResolvedValue([EDU_BTECH]);

  mockEmployersGetMe.mockResolvedValue({ defaultOrganizationId: 'org-1' });
  mockEmployersList.mockResolvedValue({ data: [ORGANIZATION] });
  mockEmployersListMine.mockResolvedValue([ORGANIZATION]);
});

afterEach(() => {
  cleanup();
  queryClients.splice(0).forEach((client) => client.clear());
});

// ── Create mode ──────────────────────────────────────────────────────────────

describe('EventForm — create mode', () => {
  it('renders the Create New Event heading', async () => {
    renderCreate();
    expect(await screen.findByText('Create New Event')).toBeInTheDocument();
  });

  it('shows Save as Draft and Save & Publish buttons', async () => {
    renderCreate();
    await screen.findByText('Create New Event');
    expect(screen.getByRole('button', { name: /save as draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save & publish/i })).toBeInTheDocument();
  });

  it('shows validation error when title is empty', async () => {
    const { toast } = await import('sonner');
    renderCreate();
    await screen.findByText('Create New Event');
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Title is required'));
  });

  it('shows validation error when description is empty', async () => {
    const { toast } = await import('sonner');
    renderCreate();
    await screen.findByText('Create New Event');
    fireEvent.change(screen.getByPlaceholderText(/Healthcare Career Summit/i), {
      target: { value: 'My Event' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Description is required'));
  });

  it('shows validation error when no category is selected', async () => {
    const { toast } = await import('sonner');
    renderCreate();
    await screen.findByText('Create New Event');
    fireEvent.change(screen.getByPlaceholderText(/Healthcare Career Summit/i), {
      target: { value: 'My Event' },
    });
    fireEvent.change(screen.getByTestId('rich-text-editor'), {
      target: { value: 'Some description' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Category is required'));
  });

  it('shows location field only for OFFLINE mode (default)', async () => {
    renderCreate();
    await screen.findByText('Create New Event');
    expect(screen.getByText('Event Location *')).toBeInTheDocument();
  });

  it('hides location field when mode is ONLINE', async () => {
    renderCreate();
    await screen.findByText('Create New Event');
    fireEvent.change(getSelectByLabel('Mode *'), { target: { value: 'ONLINE' } });
    await waitFor(() =>
      expect(screen.queryByText('Event Location *')).not.toBeInTheDocument()
    );
  });

  it('shows location field again when mode is switched back to OFFLINE', async () => {
    renderCreate();
    await screen.findByText('Create New Event');
    const modeSelect = getSelectByLabel('Mode *');
    fireEvent.change(modeSelect, { target: { value: 'ONLINE' } });
    await waitFor(() => expect(screen.queryByText('Event Location *')).not.toBeInTheDocument());
    fireEvent.change(modeSelect, { target: { value: 'OFFLINE' } });
    await waitFor(() => expect(screen.getByText('Event Location *')).toBeInTheDocument());
  });

  it('shows price field only when event is not free', async () => {
    renderCreate();
    await screen.findByText('Create New Event');
    // Free by default — price field should be hidden
    expect(screen.queryByText('Price (₹) *')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(screen.getByText('Price (₹) *')).toBeInTheDocument());
  });

  it('calls createEvent.mutateAsync with the correct payload on Save as Draft', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'new-1' });
    mockUseCreateEvent.mockReturnValue({ mutateAsync, isPending: false });
    mockSearchCities.mockResolvedValue([CITY_BLR]);

    renderCreate();
    await screen.findByText('Create New Event');

    // Fill required text fields
    fireEvent.change(screen.getByPlaceholderText(/Healthcare Career Summit/i), {
      target: { value: 'Test Event' },
    });
    fireEvent.change(screen.getByTestId('rich-text-editor'), {
      target: { value: 'Test description' },
    });
    fireEvent.change(getSelectByLabel('Category *'), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByPlaceholderText('200'), { target: { value: '50' } });

    // Fill dates and times
    document.querySelectorAll('input[type="date"]').forEach((el) =>
      fireEvent.change(el, { target: { value: '2026-07-01' } })
    );
    document.querySelectorAll('input[type="time"]').forEach((el, i) =>
      fireEvent.change(el, { target: { value: i === 0 ? '09:00' : '17:00' } })
    );

    // Select a country tag (open popover, pick India)
    clickDropdownTrigger('Country');
    fireEvent.click(await screen.findByText('India'));

    // Pick a city via the location auto-suggest
    const locationBtn = screen.getByText('Search city...').closest('button')!;
    fireEvent.click(locationBtn);
    const searchInput = await screen.findByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Ban' } });
    fireEvent.click(await screen.findByText('Bangalore'));

    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.title).toBe('Test Event');
    expect(payload.categoryId).toBe('cat-1');
    expect(payload.capacity).toBe(50);
    expect(payload.tagIds).toContain('country-in');
    expect(payload.locationId).toBe('city-blr');
  });

  it('calls publishEvent after createEvent when Save & Publish is clicked', async () => {
    const createMutate = vi.fn().mockResolvedValue({ id: 'new-pub-1' });
    const publishMutate = vi.fn().mockResolvedValue({});
    mockUseCreateEvent.mockReturnValue({ mutateAsync: createMutate, isPending: false });
    mockUsePublishEvent.mockReturnValue({ mutateAsync: publishMutate, isPending: false });
    mockSearchCities.mockResolvedValue([CITY_BLR]);

    renderCreate();
    await screen.findByText('Create New Event');

    fireEvent.change(screen.getByPlaceholderText(/Healthcare Career Summit/i), {
      target: { value: 'Published Event' },
    });
    fireEvent.change(screen.getByTestId('rich-text-editor'), {
      target: { value: 'Description here' },
    });
    fireEvent.change(getSelectByLabel('Category *'), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByPlaceholderText('200'), { target: { value: '100' } });
    document.querySelectorAll('input[type="date"]').forEach((el) =>
      fireEvent.change(el, { target: { value: '2026-08-01' } })
    );
    document.querySelectorAll('input[type="time"]').forEach((el, i) =>
      fireEvent.change(el, { target: { value: i === 0 ? '09:00' : '17:00' } })
    );

    clickDropdownTrigger('Country');
    fireEvent.click(await screen.findByText('India'));

    const locationBtn = screen.getByText('Search city...').closest('button')!;
    fireEvent.click(locationBtn);
    fireEvent.change(await screen.findByPlaceholderText('Search...'), { target: { value: 'Ban' } });
    fireEvent.click(await screen.findByText('Bangalore'));

    fireEvent.click(screen.getByRole('button', { name: /save & publish/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalled());
    await waitFor(() => expect(publishMutate).toHaveBeenCalledWith('new-pub-1'));
  });

  it('shows error toast when no tags are selected', async () => {
    const { toast } = await import('sonner');
    renderCreate();
    await screen.findByText('Create New Event');

    fireEvent.change(screen.getByPlaceholderText(/Healthcare Career Summit/i), {
      target: { value: 'Tag-less Event' },
    });
    fireEvent.change(screen.getByTestId('rich-text-editor'), {
      target: { value: 'Description here' },
    });
    fireEvent.change(getSelectByLabel('Category *'), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByPlaceholderText('200'), { target: { value: '50' } });
    document.querySelectorAll('input[type="date"]').forEach((el) =>
      fireEvent.change(el, { target: { value: '2026-09-01' } })
    );
    document.querySelectorAll('input[type="time"]').forEach((el, i) =>
      fireEvent.change(el, { target: { value: i === 0 ? '09:00' : '17:00' } })
    );
    // Switch to ONLINE so location is not required
    fireEvent.change(getSelectByLabel('Mode *'), { target: { value: 'ONLINE' } });

    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Select at least one tag')
      )
    );
  });
});

// ── Edit mode ────────────────────────────────────────────────────────────────

describe('EventForm — edit mode', () => {
  beforeEach(() => {
    mockUseEvent.mockReturnValue({ data: MOCK_EVENT, isLoading: false });
    mockGetStatesByCountrySlug.mockImplementation((slug: string) => {
      if (slug === 'india') return Promise.resolve([STATE_KA, STATE_MH]);
      if (slug === 'united-states') return Promise.resolve([STATE_CA]);
      return Promise.resolve([]);
    });
    mockGetCitiesByStateSlug.mockImplementation((slug: string) => {
      if (slug === 'karnataka') return Promise.resolve([CITY_BLR]);
      if (slug === 'maharashtra') return Promise.resolve([CITY_MUM]);
      if (slug === 'california') return Promise.resolve([CITY_SF]);
      return Promise.resolve([]);
    });
    mockGetById.mockResolvedValue(CITY_BLR);
  });

  it('renders Edit Event heading', async () => {
    renderEdit('event-1');
    expect(await screen.findByText('Edit Event')).toBeInTheDocument();
  });

  it('pre-populates the title field', async () => {
    renderEdit('event-1');
    await screen.findByText('Edit Event');
    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText(/Healthcare Career Summit/i) as HTMLInputElement).value
      ).toBe('Existing Event')
    );
  });

  it('pre-populates the capacity field', async () => {
    renderEdit('event-1');
    await screen.findByText('Edit Event');
    await waitFor(() =>
      expect((screen.getByPlaceholderText('200') as HTMLInputElement).value).toBe('100')
    );
  });

  it('shows the selected city in the location field after loading', async () => {
    renderEdit('event-1');
    await screen.findByText('Edit Event');
    // getById resolves and selectedCityOption is set → button text becomes "Bangalore"
    const locationContainer = (await screen.findByText('Event Location *')).closest('.space-y-2')!;
    await waitFor(() =>
      expect(within(locationContainer).queryByText('Bangalore')).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it('pre-selects skill tags as badges', async () => {
    renderEdit('event-1');
    await screen.findByText('Edit Event');
    // Skill "React" should appear as a badge after skillsData resolves
    await waitFor(() => expect(screen.getAllByText('React').length).toBeGreaterThan(0), {
      timeout: 3000,
    });
  });

  it('calls updateEvent.mutateAsync on save', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUseUpdateEvent.mockReturnValue({ mutateAsync, isPending: false });

    renderEdit('event-1');
    await screen.findByText('Edit Event');
    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText(/Healthcare Career Summit/i) as HTMLInputElement).value
      ).toBe('Existing Event')
    );

    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.id).toBe('event-1');
    expect(payload.title).toBe('Existing Event');
  });

  it('does not call createEvent in edit mode', async () => {
    const createMutate = vi.fn();
    const updateMutate = vi.fn().mockResolvedValue({});
    mockUseCreateEvent.mockReturnValue({ mutateAsync: createMutate, isPending: false });
    mockUseUpdateEvent.mockReturnValue({ mutateAsync: updateMutate, isPending: false });

    renderEdit('event-1');
    await screen.findByText('Edit Event');
    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText(/Healthcare Career Summit/i) as HTMLInputElement).value
      ).toBe('Existing Event')
    );

    fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    expect(createMutate).not.toHaveBeenCalled();
  });
});

// ── Cascade deselection ──────────────────────────────────────────────────────

describe('EventForm — cascade deselection', () => {
  it('deselecting a country removes its states and their cities', async () => {
    mockGetCitiesByStateSlug.mockResolvedValue([CITY_BLR]);
    renderCreate();
    await screen.findByText('Create New Event');

    // Select India
    await clickDropdownOption('Country', 'India');

    // Wait for states API then open State dropdown
    await waitFor(() => expect(mockGetStatesByCountrySlug).toHaveBeenCalledWith('india'));
    await clickDropdownOption('State', 'Karnataka');

    // Wait for cities API then open City dropdown
    await waitFor(() => expect(mockGetCitiesByStateSlug).toHaveBeenCalledWith('karnataka'));
    await clickDropdownOption('City', 'Bangalore');
    await waitFor(() => expectDropdownBadge('City', 'Bangalore'));

    // Deselect India
    await clickDropdownOption('Country', 'India');

    await waitFor(() => {
      expectNoDropdownBadge('State', 'Karnataka');
      expectNoDropdownBadge('City', 'Bangalore');
    });
  });

  it('deselecting a country does not remove states from other countries', async () => {
    mockGetStatesByCountrySlug.mockImplementation((slug: string) => {
      if (slug === 'india') return Promise.resolve([STATE_KA, STATE_MH]);
      if (slug === 'united-states') return Promise.resolve([STATE_CA]);
      return Promise.resolve([]);
    });
    mockGetCitiesByStateSlug.mockResolvedValue([]);

    renderCreate();
    await screen.findByText('Create New Event');

    // Select both countries
    await clickDropdownOption('Country', 'India');
    await clickDropdownOption('Country', 'United States');

    // Wait for states for both countries to load
    await waitFor(() => {
      expect(mockGetStatesByCountrySlug).toHaveBeenCalledWith('india');
      expect(mockGetStatesByCountrySlug).toHaveBeenCalledWith('united-states');
    });

    // Select Karnataka (India) and California (US)
    await clickDropdownOption('State', 'Karnataka');
    await clickDropdownOption('State', 'California');
    await waitFor(() => {
      expectDropdownBadge('State', 'Karnataka');
      expectDropdownBadge('State', 'California');
    });

    // Deselect India only
    await clickDropdownOption('Country', 'India');

    await waitFor(() => {
      expectNoDropdownBadge('State', 'Karnataka');
      expectDropdownBadge('State', 'California');
    });
  });

  it('deselecting a state removes only its cities', async () => {
    mockGetCitiesByStateSlug.mockImplementation((slug: string) => {
      if (slug === 'karnataka') return Promise.resolve([CITY_BLR]);
      if (slug === 'maharashtra') return Promise.resolve([CITY_MUM]);
      return Promise.resolve([]);
    });

    renderCreate();
    await screen.findByText('Create New Event');

    await clickDropdownOption('Country', 'India');

    await waitFor(() => expect(mockGetStatesByCountrySlug).toHaveBeenCalledWith('india'));
    await clickDropdownOption('State', 'Karnataka');
    await clickDropdownOption('State', 'Maharashtra');

    // Wait for both city queries then open City dropdown
    await waitFor(() => {
      expect(mockGetCitiesByStateSlug).toHaveBeenCalledWith('karnataka');
      expect(mockGetCitiesByStateSlug).toHaveBeenCalledWith('maharashtra');
    });
    await clickDropdownOption('City', 'Bangalore');
    await clickDropdownOption('City', 'Mumbai');
    await waitFor(() => {
      expectDropdownBadge('City', 'Bangalore');
      expectDropdownBadge('City', 'Mumbai');
    });

    // Deselect Karnataka — only Bangalore should disappear
    await clickDropdownOption('State', 'Karnataka');

    await waitFor(() => {
      expectNoDropdownBadge('City', 'Bangalore');
      expectDropdownBadge('City', 'Mumbai');
    });
  });

  it('adding a new state preserves already-selected cities from other states', async () => {
    mockGetCitiesByStateSlug.mockImplementation((slug: string) => {
      if (slug === 'karnataka') return Promise.resolve([CITY_BLR]);
      if (slug === 'maharashtra') return Promise.resolve([CITY_MUM]);
      return Promise.resolve([]);
    });

    renderCreate();
    await screen.findByText('Create New Event');

    await clickDropdownOption('Country', 'India');

    await waitFor(() => expect(mockGetStatesByCountrySlug).toHaveBeenCalledWith('india'));
    await clickDropdownOption('State', 'Karnataka');

    await waitFor(() => expect(mockGetCitiesByStateSlug).toHaveBeenCalledWith('karnataka'));
    await clickDropdownOption('City', 'Bangalore');
    await waitFor(() => expectDropdownBadge('City', 'Bangalore'));

    // Add Maharashtra — Bangalore must NOT disappear
    await clickDropdownOption('State', 'Maharashtra');

    await waitFor(() => expect(mockGetCitiesByStateSlug).toHaveBeenCalledWith('maharashtra'));
    await waitFor(() => expectDropdownBadge('City', 'Bangalore'));
  });
});

// ── Location auto-suggest ────────────────────────────────────────────────────

describe('EventForm — location auto-suggest', () => {
  // Helper: open the Event Location SearchableSelect popover
  async function openLocationPopover() {
    await screen.findByText('Create New Event');
    const btn = screen.getByText('Search city...').closest('button')!;
    fireEvent.click(btn);
  }

  it('shows "Type to search..." hint when the popover opens empty', async () => {
    renderCreate();
    await openLocationPopover();
    expect(await screen.findByText('Type to search...')).toBeInTheDocument();
  });

  it('calls searchCities when 3+ chars are typed', async () => {
    mockSearchCities.mockResolvedValue([CITY_BLR]);
    renderCreate();
    await openLocationPopover();

    fireEvent.change(await screen.findByPlaceholderText('Search...'), {
      target: { value: 'Ban' },
    });

    await waitFor(() => expect(mockSearchCities).toHaveBeenCalledWith('Ban'));
    expect(await screen.findByText('Bangalore')).toBeInTheDocument();
  });

  it('does not call searchCities for fewer than 3 chars', async () => {
    renderCreate();
    await openLocationPopover();

    fireEvent.change(await screen.findByPlaceholderText('Search...'), {
      target: { value: 'Ba' },
    });

    await new Promise((r) => setTimeout(r, 150));
    expect(mockSearchCities).not.toHaveBeenCalled();
  });

  it('selecting a city updates the location button text', async () => {
    mockSearchCities.mockResolvedValue([CITY_BLR]);
    renderCreate();
    await openLocationPopover();

    fireEvent.change(await screen.findByPlaceholderText('Search...'), {
      target: { value: 'Ban' },
    });
    fireEvent.click(await screen.findByText('Bangalore'));

    // After selection the popover closes and the button shows the city name
    await waitFor(() => {
      const locationContainer = screen.getByText('Event Location *').closest('.space-y-2')!;
      expect(within(locationContainer).getByText('Bangalore')).toBeInTheDocument();
    });
  });
});
