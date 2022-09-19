import minimist from 'minimist';
import { existsSync, readFileSync } from 'fs';
import { z } from 'zod';
import { Properties } from './types/properties';

export class AppPropetries {
    private static envPrefix: string = 'TMS';
    private static propertiesSchema = z.object({
        configurationId: z.string().uuid(),
        privateToken: z.string(),
        projectId: z.string().uuid(),
        url: z.string().url(),
        testRunId: z.string().uuid().optional(),
        testRunName: z.string().optional(),
        adapterMode: z.string(),
    });

    static loadProperties(properties: Partial<Properties>): Properties {
        properties = this.mergeProperties(properties, this.loadFileProperties());

        if (properties.privateToken) {
            console.warn('The configuration file specifies a private token. It is not safe. Use TMS_PRIVATE_TOKEN environment variable');
        }

        properties = this.mergeProperties(properties, this.loadCliProperties());
        properties = this.mergeProperties(properties, this.loadEnvProperties());

        return this.validateProperties(properties);
    }

    static loadFileProperties(): Partial<Properties> {
        const args = minimist(process.argv.slice(2));
        var path;
        let properties = {};

        if (process.env[`${this.envPrefix}_CONFIG_FILE`]) {
            path = process.env[`${this.envPrefix}_CONFIG_FILE`];
        }
        else if (args[`${this.envPrefix.toLowerCase()}ConfigFile`]) {
            path = args[`${this.envPrefix.toLowerCase()}ConfigFile`];
        }

        if (existsSync(path)) {
            properties = this.mergeProperties(
                properties,
                JSON.parse(
                    readFileSync(path, { encoding: 'utf8' })
                ) as Partial<Properties>
            );
        }

        return properties;
    }

    static loadCliProperties(): Partial<Properties> {
        const args = minimist(process.argv.slice(2));
        let properties = {};

        return this.mergeProperties(properties, {
            url: args[`${this.envPrefix.toLowerCase()}Url`],
            privateToken: args[`${this.envPrefix.toLowerCase()}PrivateToken`],
            projectId: args[`${this.envPrefix.toLowerCase()}ProjectId`],
            configurationId: args[`${this.envPrefix.toLowerCase()}ConfigurationId`],
            testRunId: args[`${this.envPrefix.toLowerCase()}TestRunId`],
            testRunName: args[`${this.envPrefix.toLowerCase()}TestRunName`],
            adapterMode: args[`${this.envPrefix.toLowerCase()}AdapterMode`],
        });
    }

    static loadEnvProperties(): Partial<Properties> {
        let properties = {};

        return this.mergeProperties(properties, {
            url: process.env[`${this.envPrefix}_URL`],
            privateToken: process.env[`${this.envPrefix}_PRIVATE_TOKEN`],
            projectId: process.env[`${this.envPrefix}_PROJECT_ID`],
            configurationId: process.env[`${this.envPrefix}_CONFIGURATION_ID`],
            testRunId: process.env[`${this.envPrefix}_TEST_RUN_ID`],
            testRunName: process.env[`${this.envPrefix}_TEST_RUN_NAME`],
            adapterMode: process.env[`${this.envPrefix}_ADAPTER_MODE`],
        });
    }

    static mergeProperties(
        oldProperties: Partial<Properties>,
        newProperties: Partial<Properties>
    ): Partial<Properties> {
        return {
            url: newProperties.url ?? oldProperties.url,
            privateToken: newProperties.privateToken ?? oldProperties.privateToken,
            projectId: newProperties.projectId ?? oldProperties.projectId,
            configurationId: newProperties.configurationId ?? oldProperties.configurationId,
            testRunId: newProperties.testRunId ?? oldProperties.testRunId,
            testRunName: newProperties.testRunName ?? oldProperties.testRunName,
            adapterMode: newProperties.adapterMode ?? oldProperties.adapterMode,
        };
    }

    static validateProperties(properties: Partial<Properties>): Properties {
        return this.propertiesSchema.parse(properties);
    }
}
