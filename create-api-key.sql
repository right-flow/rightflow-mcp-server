-- Create API Key for MCP Server Testing
-- Run this with: psql -U postgres -d rightflow -f create-api-key.sql

DO $$
DECLARE
    v_api_key TEXT := 'rfk_test_' || encode(gen_random_bytes(32), 'hex');
    v_key_hash TEXT;
    v_org_id UUID;
BEGIN
    -- Get the first organization (or create one if needed)
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    IF v_org_id IS NULL THEN
        -- Create a test organization
        INSERT INTO organizations (name, slug, plan_type)
        VALUES ('Test Organization', 'test-org', 'free')
        RETURNING id INTO v_org_id;
    END IF;

    -- Hash the API key (simple version - in production use proper bcrypt)
    v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');

    -- Insert the API key
    INSERT INTO mcp_api_keys (
        organization_id,
        name,
        key_prefix,
        key_hash,
        description,
        environment
    ) VALUES (
        v_org_id,
        'MCP Server Test Key',
        substring(v_api_key, 1, 8),
        v_key_hash,
        'API key for testing MCP connector with Claude Code',
        'development'
    );

    -- Display the API key (SAVE THIS - it won't be shown again!)
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'API KEY CREATED SUCCESSFULLY!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE 'API Key: %', v_api_key;
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'COPY THIS KEY NOW - IT WILL NOT BE SHOWN AGAIN!';
    RAISE NOTICE '===========================================';
END $$;
