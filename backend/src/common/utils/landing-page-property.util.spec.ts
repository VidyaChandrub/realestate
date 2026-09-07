import {
  applyLandingPageVars,
  bindLandingPageContent,
  snapshotFromProject,
  snapshotFromStandaloneUnit,
  varsFromSnapshot,
} from './landing-page-property.util';

describe('landing-page-property.util', () => {
  const project = {
    name: 'Skyline Heights',
    location: 'Whitefield',
    reraId: 'PRM/KA/1',
    possession: 'Dec 2028',
    priceMin: 1_25_00_000,
    carpetRange: '1,200 – 1,800 sq.ft',
    tagline: 'Homes by the metro',
    highlights: null,
    projectType: 'Apartment',
    constructionStage: 'Under Construction',
    landArea: 3.5,
    towerCount: 2,
    addressLine: 'Main Road',
    city: 'Bangalore',
    locality: 'Whitefield',
    amenities: [{ name: 'Pool' }, { name: 'Gym' }],
    galleryUrls: ['https://cdn.example/a.jpg'],
    connectivity: ['Metro 5 min'],
  };

  it('maps project fields onto the template keys the builder uses', () => {
    const snap = snapshotFromProject({ orgName: 'Skyline Dev', project, unitCount: 12 });
    const vars = varsFromSnapshot(snap);
    expect(vars.property_name).toBe('Skyline Heights');
    expect(vars.builder_name).toBe('Skyline Dev');
    expect(vars.starting_price).toContain('Cr');
    expect(vars.rera_number).toBe('PRM/KA/1');
    expect(vars.possession_date).toBe('Dec 2028');
    expect(vars.carpet_area).toBe('1,200 – 1,800 sq.ft');
    expect(vars.location).toContain('Whitefield');
    expect(vars.description).toBe('Homes by the metro');
  });

  it('maps a standalone unit onto the same keys', () => {
    const snap = snapshotFromStandaloneUnit({
      orgName: 'Skyline Dev',
      unit: {
        unitNo: 'Villa 12',
        configuration: '4 BHK',
        variantLabel: 'Corner',
        carpetSqft: 2400,
        builtupSqft: null,
        price: 3_50_00_000,
        addressLine: 'Sarjapur',
        notes: 'East facing',
        galleryUrls: [],
        status: 'available',
        floor: null,
        tower: null,
      },
    });
    expect(varsFromSnapshot(snap).property_name).toContain('Villa 12');
    expect(varsFromSnapshot(snap).starting_price).toContain('Cr');
    expect(varsFromSnapshot(snap).rera_number).toBe('');
  });

  it('replaces {{tokens}} and stamps inventory widgets', () => {
    const snap = snapshotFromProject({ orgName: 'Skyline Dev', project, unitCount: 12 });
    const bound = bindLandingPageContent(
      {
        sections: [
          {
            type: 'hero',
            settings: { heading: '{{property_name}}', price: '{{starting_price}}' },
            children: [],
          },
          {
            type: 'project',
            settings: { selectedProjectId: null },
            children: [],
          },
          {
            type: 'amenities',
            settings: { items: [{ title: 'Mock' }] },
            children: [],
          },
        ],
        config: { brand: { name: 'Template' } },
      },
      { kind: 'project', projectId: 'proj-1' },
      snap,
    );
    const hero = (bound.sections as { settings: { heading: string; price: string } }[])[0];
    const projectWidget = (bound.sections as { settings: { selectedProjectId: string } }[])[1];
    const amenities = (bound.sections as { settings: { items: { title: string }[] } }[])[2];
    expect(hero.settings.heading).toBe('Skyline Heights');
    expect(hero.settings.price).toContain('Cr');
    expect(projectWidget.settings.selectedProjectId).toBe('proj-1');
    expect(amenities.settings.items.map((i) => i.title)).toEqual(['Pool', 'Gym']);
    expect((bound.config.vars as Record<string, string>).property_name).toBe('Skyline Heights');
    expect((bound.config.propertyBinding as { projectId: string }).projectId).toBe('proj-1');
  });

  it('leaves unknown tokens in place', () => {
    expect(applyLandingPageVars('{{unknown_key}}', { property_name: 'X' })).toBe('{{unknown_key}}');
  });
});
