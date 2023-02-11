import { HotAPI, HotServer, HotClient, HotRoute, 
	HotRouteMethod, MySQLSchema, 
	ServerAuthorizationFunction, HotStaq, HotServerType, DeveloperMode, HotDBMySQL } from "hotstaq";
import { DataRoute } from "../src/DataRoute";

/**
 * The App's API and routes.
 */
export class AppAPI extends HotAPI
{
	constructor (baseUrl: string, connection: HotServer | HotClient, db: any = null)
	{
		super(baseUrl, connection, db);

		this.onPreRegister = async (): Promise<boolean> =>
			{
				if (connection.type !== HotServerType.Generate)
				{
					this.setDBSchema (new MySQLSchema (process.env["DATABASE_SCHEMA"]));
				}

				return (true);
			};
		this.onPostRegister = async (): Promise<boolean> =>
			{
				// Sync database tables here.

				return (true);
			};

		this.addRoute (new DataRoute (this, async (db: HotDBMySQL) =>
			{
				if (this.connection.processor.mode === DeveloperMode.Development)
				{
					await db.query (
						`create table if not exists users (
							id             INT(10)        NOT NULL AUTO_INCREMENT,
							name           VARCHAR(256)   DEFAULT '',
							email          VARCHAR(256)   DEFAULT '',
							password       VARCHAR(256)   DEFAULT '',
							verified       INT(1)         DEFAULT '0',
							registered     DATETIME       DEFAULT NOW(),
							enabled        INT(1)         DEFAULT '1',
							PRIMARY KEY (id)
						)`);
				}
			}));
	}
}