alter table public.ai_governance_policies
    add constraint ai_governance_policy_level_within_cap
    check (
      hard_cap is null
      or (
        case hard_cap
          when 'A0' then 0
          when 'A1' then 1
          when 'A2' then 2
          when 'A3' then 3
        end
        >=
        case level
          when 'A0' then 0
          when 'A1' then 1
          when 'A2' then 2
          when 'A3' then 3
        end
      )
    );
