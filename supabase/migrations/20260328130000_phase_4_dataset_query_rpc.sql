create or replace function public.query_dataset_rows(
  target_dataset_version_id uuid,
  target_filters jsonb default '[]'::jsonb,
  target_sorts jsonb default '[]'::jsonb,
  target_page integer default 1,
  target_page_size integer default 50
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  attribute_key text;
  count_sql text;
  escaped_filter_value text;
  expression_sql text;
  filter_clause text;
  filter_data_type text;
  filter_item jsonb;
  filter_literal_sql text;
  filter_op text;
  filter_source text;
  filter_value jsonb;
  filter_value_text text;
  in_values_sql text;
  offset_value integer;
  order_parts text[] := array[]::text[];
  order_sql text;
  rows_result jsonb := '{}'::jsonb;
  rows_sql text;
  sort_data_type text;
  sort_direction text;
  sort_item jsonb;
  sort_source text;
  total_rows bigint := 0;
  where_sql text := format(
    'dataset_version_id = %L::uuid',
    target_dataset_version_id
  );
begin
  if target_page < 1 then
    raise exception using errcode = '22023', message = 'target_page must be >= 1';
  end if;

  if target_page_size < 1 then
    raise exception using errcode = '22023', message = 'target_page_size must be >= 1';
  end if;

  if jsonb_typeof(coalesce(target_filters, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'target_filters must be an array';
  end if;

  if jsonb_typeof(coalesce(target_sorts, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'target_sorts must be an array';
  end if;

  offset_value := greatest(target_page - 1, 0) * target_page_size;

  for filter_item in
    select value
    from jsonb_array_elements(coalesce(target_filters, '[]'::jsonb))
  loop
    filter_source := filter_item ->> 'source';
    filter_op := filter_item ->> 'op';
    filter_data_type := coalesce(lower(filter_item ->> 'dataType'), 'text');
    filter_value := filter_item -> 'value';
    filter_clause := null;
    filter_literal_sql := null;
    filter_value_text := null;
    in_values_sql := null;

    if filter_source is null or filter_op is null then
      raise exception using errcode = '22023', message = 'Each filter requires source and op';
    end if;

    if filter_source = 'pipeline_row_id' then
      filter_data_type := 'text';
      expression_sql := 'pipeline_row_id';
    elsif filter_source = 'created_at' then
      filter_data_type := 'datetime';
      expression_sql := 'created_at';
    elsif filter_source = 'updated_at' then
      filter_data_type := 'datetime';
      expression_sql := 'updated_at';
    elsif filter_source like 'attributes.%' then
      attribute_key := substring(filter_source from 12);

      if attribute_key = '' or position('.' in attribute_key) > 0 then
        raise exception using errcode = '22023', message = format(
          'Unsupported filter source: %s',
          filter_source
        );
      end if;

      case filter_data_type
        when 'boolean' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::boolean',
            attribute_key
          );
        when 'date' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::date',
            attribute_key
          );
        when 'datetime' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::timestamptz',
            attribute_key
          );
        when 'number' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::numeric',
            attribute_key
          );
        else
          filter_data_type := 'text';
          expression_sql := format('attributes ->> %L', attribute_key);
      end case;
    else
      raise exception using errcode = '22023', message = format(
        'Unsupported filter source: %s',
        filter_source
      );
    end if;

    case filter_op
      when 'isNull' then
        filter_clause := format('%s is null', expression_sql);
      when 'in' then
        if jsonb_typeof(filter_value) <> 'array' then
          raise exception using errcode = '22023', message = format(
            'The "in" filter requires an array for source %s',
            filter_source
          );
        end if;

        select string_agg(
          case filter_data_type
            when 'boolean' then format('%L::boolean', values_array.value)
            when 'date' then format('%L::date', values_array.value)
            when 'datetime' then format('%L::timestamptz', values_array.value)
            when 'number' then format('%L::numeric', values_array.value)
            else format('%L', values_array.value)
          end,
          ', '
        )
        into in_values_sql
        from jsonb_array_elements_text(filter_value) as values_array(value);

        if in_values_sql is null then
          filter_clause := 'false';
        else
          filter_clause := format('%s in (%s)', expression_sql, in_values_sql);
        end if;
      when 'contains' then
        if filter_data_type <> 'text' then
          raise exception using errcode = '22023', message = format(
            'The "contains" operator only supports text fields: %s',
            filter_source
          );
        end if;

        filter_value_text := filter_item ->> 'value';

        if filter_value_text is null then
          raise exception using errcode = '22023', message = format(
            'The "contains" operator requires a value: %s',
            filter_source
          );
        end if;

        escaped_filter_value := replace(
          replace(replace(filter_value_text, E'\\', E'\\\\'), '%', E'\\%'),
          '_',
          E'\\_'
        );
        filter_clause := format(
          '%s ilike %L',
          expression_sql,
          '%' || escaped_filter_value || '%'
        );
      when 'startsWith' then
        if filter_data_type <> 'text' then
          raise exception using errcode = '22023', message = format(
            'The "startsWith" operator only supports text fields: %s',
            filter_source
          );
        end if;

        filter_value_text := filter_item ->> 'value';

        if filter_value_text is null then
          raise exception using errcode = '22023', message = format(
            'The "startsWith" operator requires a value: %s',
            filter_source
          );
        end if;

        escaped_filter_value := replace(
          replace(replace(filter_value_text, E'\\', E'\\\\'), '%', E'\\%'),
          '_',
          E'\\_'
        );
        filter_clause := format(
          '%s ilike %L',
          expression_sql,
          escaped_filter_value || '%'
        );
      else
        filter_value_text := filter_item ->> 'value';

        if filter_value_text is null then
          raise exception using errcode = '22023', message = format(
            'The "%s" operator requires a scalar value: %s',
            filter_op,
            filter_source
          );
        end if;

        case filter_data_type
          when 'boolean' then
            filter_literal_sql := format('%L::boolean', filter_value_text);
          when 'date' then
            filter_literal_sql := format('%L::date', filter_value_text);
          when 'datetime' then
            filter_literal_sql := format('%L::timestamptz', filter_value_text);
          when 'number' then
            filter_literal_sql := format('%L::numeric', filter_value_text);
          else
            filter_literal_sql := format('%L', filter_value_text);
        end case;

        case filter_op
          when 'eq' then
            filter_clause := format('%s = %s', expression_sql, filter_literal_sql);
          when 'neq' then
            filter_clause := format(
              '%s is distinct from %s',
              expression_sql,
              filter_literal_sql
            );
          when 'gt' then
            filter_clause := format('%s > %s', expression_sql, filter_literal_sql);
          when 'gte' then
            filter_clause := format('%s >= %s', expression_sql, filter_literal_sql);
          when 'lt' then
            filter_clause := format('%s < %s', expression_sql, filter_literal_sql);
          when 'lte' then
            filter_clause := format('%s <= %s', expression_sql, filter_literal_sql);
          else
            raise exception using errcode = '22023', message = format(
              'Unsupported filter operator: %s',
              filter_op
            );
        end case;
    end case;

    where_sql := where_sql || ' and ' || filter_clause;
  end loop;

  for sort_item in
    select value
    from jsonb_array_elements(coalesce(target_sorts, '[]'::jsonb))
  loop
    sort_source := sort_item ->> 'source';
    sort_direction := lower(coalesce(sort_item ->> 'direction', 'asc'));
    sort_data_type := coalesce(lower(sort_item ->> 'dataType'), 'text');

    if sort_source is null then
      raise exception using errcode = '22023', message = 'Each sort requires a source';
    end if;

    if sort_direction not in ('asc', 'desc') then
      raise exception using errcode = '22023', message = format(
        'Unsupported sort direction: %s',
        sort_direction
      );
    end if;

    if sort_source = 'pipeline_row_id' then
      sort_data_type := 'text';
      expression_sql := 'pipeline_row_id';
    elsif sort_source = 'created_at' then
      sort_data_type := 'datetime';
      expression_sql := 'created_at';
    elsif sort_source = 'updated_at' then
      sort_data_type := 'datetime';
      expression_sql := 'updated_at';
    elsif sort_source like 'attributes.%' then
      attribute_key := substring(sort_source from 12);

      if attribute_key = '' or position('.' in attribute_key) > 0 then
        raise exception using errcode = '22023', message = format(
          'Unsupported sort source: %s',
          sort_source
        );
      end if;

      case sort_data_type
        when 'boolean' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::boolean',
            attribute_key
          );
        when 'date' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::date',
            attribute_key
          );
        when 'datetime' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::timestamptz',
            attribute_key
          );
        when 'number' then
          expression_sql := format(
            'nullif(attributes ->> %L, '''')::numeric',
            attribute_key
          );
        else
          sort_data_type := 'text';
          expression_sql := format('attributes ->> %L', attribute_key);
      end case;
    else
      raise exception using errcode = '22023', message = format(
        'Unsupported sort source: %s',
        sort_source
      );
    end if;

    order_parts := array_append(
      order_parts,
      format('%s %s nulls last', expression_sql, sort_direction)
    );
  end loop;

  if coalesce(array_length(order_parts, 1), 0) = 0 then
    order_parts := array['row_index asc nulls last', 'id asc'];
  else
    order_parts := array_append(order_parts, 'id asc');
  end if;

  order_sql := array_to_string(order_parts, ', ');
  count_sql := format(
    'select count(*) from public.dataset_rows where %s',
    where_sql
  );

  execute count_sql into total_rows;

  rows_sql := format(
    $query$
      select jsonb_build_object(
        'rows',
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'rowId',
              paged_rows.id,
              'pipelineRowId',
              paged_rows.pipeline_row_id,
              'attributes',
              paged_rows.attributes,
              'createdAt',
              paged_rows.created_at,
              'updatedAt',
              paged_rows.updated_at
            )
            order by %s
          ),
          '[]'::jsonb
        ),
        'totalRows',
        %s
      )
      from (
        select
          id,
          pipeline_row_id,
          attributes,
          created_at,
          updated_at,
          row_index
        from public.dataset_rows
        where %s
        order by %s
        limit %s
        offset %s
      ) as paged_rows
    $query$,
    order_sql,
    total_rows,
    where_sql,
    order_sql,
    target_page_size,
    offset_value
  );

  execute rows_sql into rows_result;

  return rows_result;
end;
$$;

revoke all on function public.query_dataset_rows(uuid, jsonb, jsonb, integer, integer) from public;
grant execute on function public.query_dataset_rows(uuid, jsonb, jsonb, integer, integer) to authenticated;
