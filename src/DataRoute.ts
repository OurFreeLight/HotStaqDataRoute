import { HotRoute, HotDBMySQL, HotAPI, ConnectionStatus, 
	HotStaq, HotTestDriver, HotServerType, ServerRequest } from "hotstaq";

/**
 * Data route.
 */
export class DataRoute extends HotRoute
{
	/**
	 * The database connection.
	 */
	db: HotDBMySQL;

	/**
	 * @param api The API to attach this route to.
	 * @param onStartQueries The queries to execute when registering this route. This 
	 * would be executing any create if not exists tables, initial inserts, etc.
	 */
	constructor (api: HotAPI, onRegisteringRoute: ((db: HotDBMySQL) => Promise<void>) = null)
	{
		super (api.connection, "data");

		this.onRegister = async () =>
			{
				if (api.connection.type !== HotServerType.Generate)
				{
					this.db = (<HotDBMySQL>this.connection.api.db);

					if (this.db.connectionStatus !== ConnectionStatus.Connected)
						return (true);

					if (onRegisteringRoute != null)
						await onRegisteringRoute (this.db);
				}

				return (true);
			};

		this.addMethod ({
			"name": "add",
			"onServerExecute": this.add,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to add data to."
				},
				"fields": {
					"type": "string",
					"required": true,
					"description": 
						`The fields and their values to add to the database. A key/value object must be passed. Example: { "name": "Test_User" }`
				}
			},
			"description": "Add results to the database.",
			"returns": "Returns true if successful.",
			"testCases": [
				"addTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.add ({
							"schema": "users",
							"fields": {
								"name": "Test_User",
								"email": "test@test.com"
							}
						});

					driver.assert (resp === true, "Unable to add item!");
				}
			]
		});
		this.addMethod ({
			"name": "list",
			"onServerExecute": this.list,
			"parameters": {
				"schema": {
					"type": "string",
					"required": true,
					"description": "The schema to access."
				},
				"fields": {
					"type": "array",
					"required": true,
					"description": "The list of fields in the schema to access."
				},
				"offset": {
					"type": "int",
					"required": false,
					"description": "The offset."
				},
				"limit": {
					"type": "int",
					"required": false,
					"description": "The max number of results to return. Default is 20."
				}
			},
			"description": "List results from a schema.",
			"returns": "Returns the results from the schema.",
			"testCases": [
				"listTest",
				async (driver: HotTestDriver): Promise<any> =>
				{
					// @ts-ignore
					let resp = await api.data.list ({
							"schema": "users"
						});

					driver.assert (resp.length > 0, "Unable to list items!");
				}
			]
		});
	}

	/**
	 * Add some data.
	 */
	protected async add (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let fields: any = HotStaq.getParam ("fields", req.jsonObj);
		let insertQuery: string = "";
		let insertArray = [schema];

		for (let key in fields)
		{
			let field: string = key;
			let value: any = fields[key];

			insertQuery += `${field} = ?, `;
			insertArray.push (value);
		}

		if (insertArray.length > 1)
			insertQuery = insertQuery.substring (0, (insertQuery.length - 2));

		let result = await this.db.query (`insert into ?? set ${insertQuery};`, insertArray);

		if (result.error != null)
			throw new Error (result.error);

        return (true);
	}

	/**
	 * List some data.
	 */
	protected async list (req: ServerRequest): Promise<any>
	{
		let schema: string = HotStaq.getParam ("schema", req.jsonObj);
		let fields: any = HotStaq.getParamDefault ("fields", req.jsonObj, {});
		let offset: number = HotStaq.getParamDefault ("offset", req.jsonObj, 0);
		let limit: number = HotStaq.getParamDefault ("limit", req.jsonObj, 20);

		let queryStr: string = "select * from ??";
		let values: any = [schema];

		for (let key in fields)
		{
			let fieldElement = fields[key];
			let value = fieldElement.value;

			if (values.length === 1)
				queryStr += " where ";

			queryStr += `?? = ? AND `;

			values.push (key);
			values.push (value);
		}

		if (values.length > 1)
			queryStr = queryStr.substring (0, (queryStr.length - 5));

		values.push (offset);
		values.push (limit);

		let strtemp = this.db.db.format (queryStr, values);
		this.logger.verbose (strtemp);
		let result = await this.db.query (queryStr, values);

		if (result.error != null)
			throw result.error;

		this.logger.verbose (JSON.stringify (result));
		let results = result.results;

        return (results);
	}
}