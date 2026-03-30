do $$
declare
  admin_user_id constant uuid := '11111111-1111-4111-8111-111111111111';
  workspace_a_owner_id constant uuid := '22222222-2222-4222-8222-222222222222';
  workspace_b_owner_id constant uuid := '33333333-3333-4333-8333-333333333333';
  dual_workspace_user_id constant uuid := '44444444-4444-4444-8444-444444444444';
  direct_grant_user_id constant uuid := '55555555-5555-4555-8555-555555555555';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@accelerate.test',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Admin User"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      workspace_a_owner_id,
      'authenticated',
      'authenticated',
      'owner-a@accelerate.test',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Workspace A Owner"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      workspace_b_owner_id,
      'authenticated',
      'authenticated',
      'owner-b@accelerate.test',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Workspace B Owner"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      dual_workspace_user_id,
      'authenticated',
      'authenticated',
      'dual-member@accelerate.test',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Dual Workspace Member"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      direct_grant_user_id,
      'authenticated',
      'authenticated',
      'direct-grant@accelerate.test',
      crypt('password123', gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Direct Grant User"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    );

  update public.profiles
  set app_role = 'admin'
  where user_id = admin_user_id;
end;
$$;

insert into public.workspaces (id, slug, name, description)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'workspace-a',
    'Workspace A',
    'Primary workspace for owner-scoped and shared datasets.'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'workspace-b',
    'Workspace B',
    'Secondary workspace used to prove shared workspace grants.'
  );

insert into public.workspace_members (workspace_id, user_id, role)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    'owner'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '44444444-4444-4444-8444-444444444444',
    'admin'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '33333333-3333-4333-8333-333333333333',
    'owner'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '44444444-4444-4444-8444-444444444444',
    'member'
  );

insert into public.datasets (
  id,
  slug,
  name,
  description,
  visibility,
  is_default_global,
  owner_workspace_id,
  metadata
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'accelerate-core-global',
    'Accelerate Core Global',
    'Default global dataset visible to every authenticated user.',
    'global',
    true,
    null,
    '{"seedCategory":"global"}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'workspace-a-portfolio',
    'Workspace A Portfolio',
    'Workspace-scoped dataset owned by Workspace A.',
    'workspace',
    false,
    '10000000-0000-4000-8000-000000000001',
    '{"seedCategory":"workspace"}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'executive-private-list',
    'Executive Private List',
    'Private dataset available only through explicit grants and admin access.',
    'private',
    false,
    null,
    '{"seedCategory":"private"}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'shared-market-map',
    'Shared Market Map',
    'Shared dataset owned by Workspace A and granted to Workspace B.',
    'shared',
    false,
    '10000000-0000-4000-8000-000000000001',
    '{"seedCategory":"shared"}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'workspace-a-combined-signals',
    'Workspace A Combined Signals',
    'Merged dataset output owned by Workspace A and shared to Workspace B.',
    'shared',
    false,
    '10000000-0000-4000-8000-000000000001',
    '{"seedCategory":"merged"}'::jsonb
  );

insert into public.dataset_versions (
  id,
  dataset_id,
  version_number,
  column_definitions,
  row_count,
  source_ref,
  metadata
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1,
    '{
      "columns": [
        {
          "key": "pipeline_row_id",
          "label": "Row ID",
          "dataType": "text",
          "source": "pipeline_row_id",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "system"
        },
        {
          "key": "company_name",
          "label": "Company",
          "dataType": "text",
          "source": "attributes.company_name",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "attribute"
        }
      ]
    }'::jsonb,
    2,
    'seed/global.csv',
    '{"seedCategory":"global"}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    1,
    '{
      "columns": [
        {
          "key": "pipeline_row_id",
          "label": "Row ID",
          "dataType": "text",
          "source": "pipeline_row_id",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "system"
        },
        {
          "key": "account_name",
          "label": "Account",
          "dataType": "text",
          "source": "attributes.account_name",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "attribute"
        }
      ]
    }'::jsonb,
    2,
    'seed/workspace-a.csv',
    '{"seedCategory":"workspace"}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    1,
    '{
      "columns": [
        {
          "key": "pipeline_row_id",
          "label": "Row ID",
          "dataType": "text",
          "source": "pipeline_row_id",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "system"
        },
        {
          "key": "contact_name",
          "label": "Contact",
          "dataType": "text",
          "source": "attributes.contact_name",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "attribute"
        }
      ]
    }'::jsonb,
    1,
    'seed/private.csv',
    '{"seedCategory":"private"}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000004',
    1,
    '{
      "columns": [
        {
          "key": "pipeline_row_id",
          "label": "Row ID",
          "dataType": "text",
          "source": "pipeline_row_id",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "system"
        },
        {
          "key": "market_name",
          "label": "Market",
          "dataType": "text",
          "source": "attributes.market_name",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "attribute"
        }
      ]
    }'::jsonb,
    2,
    'seed/shared.csv',
    '{"seedCategory":"shared"}'::jsonb
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000005',
    1,
    '{
      "columns": [
        {
          "key": "pipeline_row_id",
          "label": "Row ID",
          "dataType": "text",
          "source": "pipeline_row_id",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "system"
        },
        {
          "key": "account_name",
          "label": "Account",
          "dataType": "text",
          "source": "attributes.account_name",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "attribute"
        },
        {
          "key": "market_name",
          "label": "Market",
          "dataType": "text",
          "source": "attributes.market_name",
          "sortable": true,
          "filterable": true,
          "searchable": true,
          "kind": "attribute"
        }
      ]
    }'::jsonb,
    2,
    'seed/workspace-a-combined-signals.csv',
    '{"seedCategory":"merged"}'::jsonb
  );

update public.datasets
set active_version_id = '30000000-0000-4000-8000-000000000001'
where id = '20000000-0000-4000-8000-000000000001';

update public.datasets
set active_version_id = '30000000-0000-4000-8000-000000000002'
where id = '20000000-0000-4000-8000-000000000002';

update public.datasets
set active_version_id = '30000000-0000-4000-8000-000000000003'
where id = '20000000-0000-4000-8000-000000000003';

update public.datasets
set active_version_id = '30000000-0000-4000-8000-000000000004'
where id = '20000000-0000-4000-8000-000000000004';

update public.datasets
set active_version_id = '30000000-0000-4000-8000-000000000005'
where id = '20000000-0000-4000-8000-000000000005';

insert into public.dataset_version_sources (
  id,
  dataset_version_id,
  source_dataset_version_id,
  relation_type
)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000002',
    'merged_from'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000004',
    'merged_from'
  );

insert into public.dataset_rows (
  id,
  dataset_version_id,
  pipeline_row_id,
  row_index,
  attributes,
  lineage
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'global-1',
    1,
    '{"company_name":"Acme Cloud","country":"US"}'::jsonb,
    '{"ingestedFrom":"seed/global.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'global-2',
    2,
    '{"company_name":"Northwind Data","country":"CA"}'::jsonb,
    '{"ingestedFrom":"seed/global.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000002',
    'workspace-a-1',
    1,
    '{"account_name":"Apex Manufacturing","segment":"Enterprise"}'::jsonb,
    '{"ingestedFrom":"seed/workspace-a.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000002',
    'workspace-a-2',
    2,
    '{"account_name":"Pioneer Logistics","segment":"Mid-market"}'::jsonb,
    '{"ingestedFrom":"seed/workspace-a.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    '30000000-0000-4000-8000-000000000003',
    'private-1',
    1,
    '{"contact_name":"Jordan Lee","priority":"High"}'::jsonb,
    '{"ingestedFrom":"seed/private.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    '30000000-0000-4000-8000-000000000004',
    'shared-1',
    1,
    '{"market_name":"Nordics","status":"Active"}'::jsonb,
    '{"ingestedFrom":"seed/shared.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000007',
    '30000000-0000-4000-8000-000000000004',
    'shared-2',
    2,
    '{"market_name":"DACH","status":"Pilot"}'::jsonb,
    '{"ingestedFrom":"seed/shared.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000008',
    '30000000-0000-4000-8000-000000000005',
    'combined-1',
    1,
    '{"account_name":"Apex Manufacturing","market_name":"Nordics","status":"Active"}'::jsonb,
    '{"ingestedFrom":"seed/workspace-a-combined-signals.csv"}'::jsonb
  ),
  (
    '40000000-0000-4000-8000-000000000009',
    '30000000-0000-4000-8000-000000000005',
    'combined-2',
    2,
    '{"account_name":"Pioneer Logistics","market_name":"DACH","status":"Pilot"}'::jsonb,
    '{"ingestedFrom":"seed/workspace-a-combined-signals.csv"}'::jsonb
  );

insert into public.dataset_access (
  dataset_id,
  user_id,
  workspace_id,
  granted_by
)
values
  (
    '20000000-0000-4000-8000-000000000003',
    '55555555-5555-4555-8555-555555555555',
    null,
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    null,
    '10000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    null,
    '10000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '55555555-5555-4555-8555-555555555555',
    null,
    '11111111-1111-4111-8111-111111111111'
  );

insert into public.invites (
  id,
  email,
  token_hash,
  status,
  expires_at,
  accepted_at,
  created_by,
  metadata
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    'future-member@accelerate.test',
    'seed-invite-token-hash',
    'pending',
    timezone('utc', now()) + interval '7 days',
    null,
    '11111111-1111-4111-8111-111111111111',
    '{"seedPurpose":"phase-3-validation"}'::jsonb
  );
