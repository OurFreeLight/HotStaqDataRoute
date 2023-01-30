import { HotAPI, HotServer, HotClient, HotRoute, 
	HotRouteMethod, MySQLSchema, 
	ServerAuthorizationFunction, HotStaq, HotServerType } from "hotstaq";
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

		this.addRoute (new DataRoute (this));
	}
}